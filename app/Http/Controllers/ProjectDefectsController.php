<?php

namespace App\Http\Controllers;

use App\Models\DefectLink;
use App\Models\Project;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ProjectDefectsController extends Controller
{
    /**
     * Display all defect links for a project, aggregated across all test runs.
     *
     * GET /projects/{project}/defects
     *
     * Schema reality:
     *   defect_links  → test_result_id → test_results.id
     *   test_results  → run_id         → test_runs.id
     *   test_results  → case_id        → test_cases.id   (direct FK, no need to go through tests)
     */
    public function index(Request $request, Project $project): Response
    {
        $user = $request->user();

        abort_unless(
            $user->hasRole('admin') || $project->members()->whereKey($user->getKey())->exists(),
            403,
        );

        $defects = DefectLink::query()
            ->select([
                'defect_links.id',
                'defect_links.tracker_type',
                'defect_links.external_id',
                'defect_links.external_url',
                'defect_links.title',
                'defect_links.status',
                'defect_links.cache_refreshed_at',
                'defect_links.test_result_id',
                // From test_results
                'test_results.run_id',
                // From test_runs
                'test_runs.title as run_title',
                // From test_cases (joined directly via test_results.case_id)
                'test_cases.title as test_title',
            ])
            ->join('test_results', 'test_results.id', '=', 'defect_links.test_result_id')
            ->join('test_runs',    'test_runs.id',    '=', 'test_results.run_id')
            ->join('test_cases',   'test_cases.id',   '=', 'test_results.case_id')
            ->where('test_runs.project_id', $project->id)
            ->orderByDesc('defect_links.created_at')
            ->get()
            ->map(fn ($row) => [
                'id'                 => $row->id,
                'tracker_type'       => $row->tracker_type,
                'external_id'        => $row->external_id,
                'external_url'       => $row->external_url,
                'title'              => $row->title,
                'status'             => $row->status,
                'cache_refreshed_at' => $row->cache_refreshed_at,
                'test_result_id'     => $row->test_result_id,
                'run_id'             => $row->run_id,
                'run_title'          => $row->run_title,
                'test_title'         => $row->test_title,
            ]);

        return Inertia::render('projects/defects/index', [
            'project' => $project->only(['id', 'name']),
            'defects' => $defects,
        ]);
    }
}
