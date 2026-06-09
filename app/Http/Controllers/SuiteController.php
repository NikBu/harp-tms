<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Section;
use App\Models\Suite;
use App\Models\TestCase;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuiteController extends Controller
{
    /**
     * @var array<int, string>
     */
    private const TEMPLATE_MAP = [
        1 => 'text',
        2 => 'steps',
        3 => 'exploratory',
        4 => 'bdd',
        5 => 'checklist',
    ];

    /**
     * @var array<int, string>
     */
    private const PRIORITY_MAP = [
        1 => 'critical',
        2 => 'high',
        3 => 'medium',
        4 => 'low',
    ];

    /**
     * Display a listing of the suites for the given project.
     */
    public function index(Request $request, Project $project): Response|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($project->suite_mode === Project::SUITE_SINGLE) {
            $suite = $project->suites()->oldest('id')->first();

            if ($suite !== null) {
                return to_route('suites.show', $suite);
            }
        }

        return Inertia::render('suites/index', [
            'project' => $project,
            'suites'  => $project->suites()->latest()->paginate(20),
        ]);
    }

    /**
     * Show the form for creating a new suite.
     *
     * For single-suite modes, redirect away if a suite already exists.
     */
    public function create(Request $request, Project $project): Response|RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        if ($this->suiteCapReached($project)) {
            Inertia::flash('toast', [
                'type'    => 'error',
                'message' => __('app.suites.single_mode_limit'),
            ]);

            return to_route('suites.index', $project);
        }

        return Inertia::render('suites/create', [
            'project' => $project,
        ]);
    }

    /**
     * Store a newly created suite in storage.
     */
    public function store(Request $request, Project $project): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $project);

        // Enforce single-suite mode at the write layer as well
        abort_if($this->suiteCapReached($project), 422, __('app.suites.single_mode_limit'));

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $validated['created_by'] = Auth::id();

        $suite = $project->suites()->create($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.created')]);

        return to_route('suites.show', $suite);
    }

    /**
     * Display the specified suite with its section tree.
     */
    public function show(Request $request, Suite $suite): Response
    {
        $project = $suite->project;

        $this->authorizeProjectAccess($request, $project);

        $caseEager = [
            'testCases' => function ($query): void {
                $query->orderBy('display_order')
                    ->orderBy('id')
                    ->withCount('requirements');
            },
        ];

        $suite->load([
            'sections' => function ($query) use ($caseEager): void {
                $query->whereNull('parent_id')
                    ->orderBy('display_order')
                    ->with(array_merge($caseEager, [
                        'children' => function ($child) use ($caseEager): void {
                            $child->orderBy('display_order')->with($caseEager);
                        },
                    ]));
            },
        ]);

        return Inertia::render('suites/show', [
            'project'  => $project,
            'suite'    => $suite->only(['id', 'project_id', 'name', 'description', 'created_at', 'updated_at']),
            'sections' => $suite->sections->map(fn (Section $section): array => $this->transformSection($section))->all(),
        ]);
    }

    /**
     * Show the form for editing the specified suite.
     */
    public function edit(Request $request, Suite $suite): Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        return Inertia::render('suites/edit', [
            'suite' => $suite->load('project'),
        ]);
    }

    /**
     * Export the suite's test cases as CSV or XML.
     */
    public function export(Request $request, Suite $suite): StreamedResponse|Response
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $format = $request->string('format', 'csv')->lower()->value();

        $suite->load(['sections' => function ($query): void {
            $query->orderBy('display_order')->with(['testCases' => function ($cases): void {
                $cases->orderBy('display_order')->orderBy('id')->with('section:id,name');
            }]);
        }]);

        $cases = $suite->sections
            ->flatMap(fn (Section $section) => $section->testCases)
            ->values();

        $filename = preg_replace('/[^A-Za-z0-9_-]+/', '_', $suite->name) ?: 'suite';

        if ($format === 'xml') {
            $xml = new \SimpleXMLElement('<suite/>');
            $xml->addChild('name', htmlspecialchars($suite->name));
            $casesEl = $xml->addChild('cases');

            foreach ($cases as $case) {
                $cEl = $casesEl->addChild('case');
                $cEl->addChild('id', (string) $case->id);
                $cEl->addChild('title', htmlspecialchars((string) $case->title));
                $cEl->addChild('section', htmlspecialchars((string) ($case->section?->name ?? '')));
                $cEl->addChild('priority', htmlspecialchars((string) ($case->priority ?? '')));
                $cEl->addChild('type', htmlspecialchars((string) ($case->case_type ?? '')));
                $cEl->addChild('template', htmlspecialchars((string) $case->template));
            }

            return response($xml->asXML(), 200, [
                'Content-Type'        => 'application/xml',
                'Content-Disposition' => 'attachment; filename="'.$filename.'.xml"',
            ]);
        }

        // CSV (also the fallback for any unsupported format such as xlsx)
        $headers = [
            'Content-Type'        => 'text/csv',
            'Content-Disposition' => 'attachment; filename="'.$filename.'.csv"',
        ];

        $callback = function () use ($cases): void {
            $handle = fopen('php://output', 'w');
            fputcsv($handle, ['ID', 'Title', 'Section', 'Priority', 'Type', 'Template', 'Preconditions', 'References']);

            foreach ($cases as $case) {
                fputcsv($handle, [
                    $case->id,
                    $case->title,
                    $case->section?->name,
                    $case->priority,
                    $case->case_type,
                    $case->template,
                    strip_tags((string) ($case->preconditions ?? '')),
                    $case->refs ?? '',
                ]);
            }

            fclose($handle);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * Update the specified suite in storage.
     */
    public function update(Request $request, Suite $suite): RedirectResponse
    {
        $this->authorizeProjectAccess($request, $suite->project);

        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
        ]);

        $suite->update($validated);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.updated')]);

        return back();
    }

    /**
     * Remove the specified suite from storage.
     */
    public function destroy(Request $request, Suite $suite): RedirectResponse
    {
        $project = $suite->project;
        $user    = $request->user();

        $isProjectAdmin = $project->members()
            ->whereKey($user->getKey())
            ->wherePivot('role', 'project_admin')
            ->exists();

        abort_unless($isProjectAdmin || $user->hasRole('admin'), 403);

        $suite->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('app.suites.deleted')]);

        return to_route('suites.index', $project);
    }

    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    /**
     * Returns true when the project's suite mode only allows one suite
     * AND that suite already exists.
     *
     * SUITE_SINGLE (1)          → exactly one suite, no baseline branching
     * SUITE_SINGLE_BASELINE (2) → one active suite + baseline copies (those are
     *                             created programmatically, not by the user form)
     * SUITE_MULTI (3)           → no cap
     */
    private function suiteCapReached(Project $project): bool
    {
        if ($project->suite_mode === Project::SUITE_MULTI) {
            return false;
        }

        return $project->suites()->exists();
    }

    /**
     * Transform a section (and its children) into the shape the suite page expects.
     *
     * @return array<string, mixed>
     */
    private function transformSection(Section $section): array
    {
        return [
            'id'         => $section->id,
            'suite_id'   => $section->suite_id,
            'parent_id'  => $section->parent_id,
            'name'       => $section->name,
            'description' => $section->description,
            'testCases'  => $section->relationLoaded('testCases')
                ? $section->testCases->map(fn (TestCase $case): array => $this->transformCase($case))->all()
                : [],
            'children'   => $section->relationLoaded('children')
                ? $section->children->map(fn (Section $child): array => $this->transformSection($child))->all()
                : [],
        ];
    }

    /**
     * Minimal test-case shape for the suite listing.
     *
     * @return array<string, mixed>
     */
    private function transformCase(TestCase $case): array
    {
        $templateInt = array_search($case->template, self::TEMPLATE_MAP, true);
        $priorityInt = array_search($case->priority, self::PRIORITY_MAP, true);

        return [
            'id'               => $case->id,
            'suite_id'         => $case->suite_id,
            'section_id'       => $case->section_id,
            'title'            => $case->title,
            'template'         => $templateInt === false ? 2 : $templateInt,
            'type_id'          => $case->case_type,
            'priority_id'      => $priorityInt === false ? null : $priorityInt,
            'has_requirements' => ($case->requirements_count ?? 0) > 0,
        ];
    }

    /**
     * Ensure the current user may access the given project.
     */
    private function authorizeProjectAccess(Request $request, Project $project): void
    {
        $user = $request->user();

        if ($user->hasRole('admin')) {
            return;
        }

        abort_unless(
            $project->members()->whereKey($user->getKey())->exists(),
            403
        );
    }
}