<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Reports\ActivitySummarySegment;
use App\Services\Reports\CaseDistributionSegment;
use App\Services\Reports\CrossProjectSegment;
use App\Services\Reports\DashboardSegment;
use App\Services\Reports\MilestoneProgressSegment;
use App\Services\Reports\ResultCoverageSegment;
use App\Services\Reports\WorkloadSegment;
use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;
use Illuminate\Support\Collection;
use Inertia\Inertia;
use Inertia\Response;

class ReportController extends Controller
{
    /**
     * Available report types (key, i18n-ready).
     *
     * @var list<array{key: string}>
     */
    private const REPORT_TYPES = [
        ['key' => 'activity_summary'],
        ['key' => 'result_coverage'],
        ['key' => 'milestone_progress'],
        ['key' => 'case_distribution'],
        ['key' => 'workload'],
    ];

    public function __construct(
        private readonly DashboardSegment         $dashboard,
        private readonly ActivitySummarySegment   $activity,
        private readonly ResultCoverageSegment    $coverage,
        private readonly CaseDistributionSegment  $distribution,
        private readonly MilestoneProgressSegment $milestones,
        private readonly WorkloadSegment          $workload,
        private readonly CrossProjectSegment      $crossProject,
    ) {}

    /**
     * Per-project report landing page.
     */
    public function index(Request $request, Project $project): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $user     = $request->user();
        $projects = $user->hasRole('admin')
            ? Project::orderBy('name')->get(['id', 'name'])
            : $user->projects()->orderBy('name')->get(['projects.id', 'projects.name']);

        return Inertia::render('reports/index', [
            'project'     => $project->only(['id', 'name']),
            'projects'    => $projects,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal'    => false,
            'dashboard'   => $this->dashboard->compute(collect([$project])),
        ]);
    }

    /**
     * Global (no project context) report landing page.
     */
    public function globalIndex(Request $request): Response
    {
        $user = $request->user();

        $projects = $user->hasRole('admin')
            ? Project::orderBy('name')->get(['id', 'name'])
            : $user->projects()->orderBy('name')->get(['projects.id', 'projects.name']);

        return Inertia::render('reports/index', [
            'project'     => null,
            'projects'    => $projects,
            'reportTypes' => self::REPORT_TYPES,
            'isGlobal'    => true,
            'dashboard'   => $this->dashboard->compute($projects),
        ]);
    }

    /**
     * Show a single report for a specific project.
     */
    public function show(Request $request, Project $project, string $type): Response
    {
        $this->authorizeProjectAccess($request, $project);

        $reportKey = collect(self::REPORT_TYPES)->firstWhere('key', $type);
        abort_if($reportKey === null, 404);

        return Inertia::render('reports/show', [
            'project' => $project->only(['id', 'name']),
            'type'    => $type,
            'data'    => $this->computeReport([$project->id], $type),
        ]);
    }

    /**
     * Export a single report as CSV, XLSX, or PDF.
     */
    public function export(Request $request, Project $project, string $type): HttpResponse
    {
        $this->authorizeProjectAccess($request, $project);

        $reportKey = collect(self::REPORT_TYPES)->firstWhere('key', $type);
        abort_if($reportKey === null, 404);

        $format = $request->query('format', 'csv');
        abort_unless(in_array($format, ['csv', 'xlsx', 'pdf'], true), 422, 'Unsupported format.');

        $data = $this->computeReport([$project->id], $type);
        abort_if($data === null, 404);

        $rows    = $this->flattenReportData($type, $data);
        $title   = __('app.reports.types.' . $type . '.name');
        $filename = $project->name . '_' . $type . '_' . now()->format('Ymd');

        return match ($format) {
            'csv'  => $this->exportCsv($rows, $filename),
            'xlsx' => $this->exportXlsx($rows, $filename, $title),
            'pdf'  => $this->exportPdf($rows, $filename, $title, $project->name),
        };
    }

    /**
     * Aggregate one report type across several projects.
     */
    public function cross(Request $request): Response
    {
        $user = $request->user();

        $validated = $request->validate([
            'project_ids'   => ['required', 'array', 'min:1'],
            'project_ids.*' => ['integer', 'exists:projects,id'],
            'type'          => ['required', 'string'],
        ]);

        abort_if(collect(self::REPORT_TYPES)->firstWhere('key', $validated['type']) === null, 404);

        $projects = Project::whereIn('id', $validated['project_ids'])->get();

        $accessible = $projects->filter(function (Project $project) use ($user): bool {
            return $user->hasRole('admin')
                || $project->members()->whereKey($user->getKey())->exists();
        });

        $results = $this->crossProject->compute($accessible, $validated['type']);

        return Inertia::render('reports/cross-project', [
            'results'  => $results,
            'type'     => $validated['type'],
            'projects' => $accessible->map->only(['id', 'name'])->values(),
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * @param  list<int>  $projectIds
     * @return array<string, mixed>|null
     */
    private function computeReport(array $projectIds, string $type): ?array
    {
        return match ($type) {
            'activity_summary'   => $this->activity->compute($projectIds),
            'result_coverage'    => $this->coverage->compute($projectIds),
            'case_distribution'  => $this->distribution->compute($projectIds),
            'milestone_progress' => $this->milestones->compute($projectIds),
            'workload'           => $this->workload->compute($projectIds),
            default              => null,
        };
    }

    /**
     * Flatten report data into a rows array suitable for tabular export.
     * Each row is an associative array of column => value.
     *
     * @param  array<string, mixed>  $data
     * @return list<array<string, mixed>>
     */
    private function flattenReportData(string $type, array $data): array
    {
        return match ($type) {
            'activity_summary' => array_map(
                fn ($d) => [
                    'Date'           => $d['date'],
                    'New Cases'      => $d['new_cases'],
                    'Updated Cases'  => $d['updated_cases'],
                    'Results Logged' => $d['new_results'],
                ],
                $data['daily'] ?? []
            ),

            'result_coverage' => [
                [
                    'Passed'   => $data['passed']   ?? 0,
                    'Failed'   => $data['failed']   ?? 0,
                    'Blocked'  => $data['blocked']  ?? 0,
                    'Retest'   => $data['retest']   ?? 0,
                    'Skipped'  => $data['skipped']  ?? 0,
                    'Untested' => $data['untested'] ?? 0,
                    'Coverage %' => $data['coverage']['pct'] ?? 0,
                ],
            ],

            'case_distribution' => array_merge(
                [['Group' => 'By Priority', 'Label' => 'Critical', 'Count' => $data['byPriority']['critical'] ?? 0]],
                [['Group' => 'By Priority', 'Label' => 'High',     'Count' => $data['byPriority']['high']     ?? 0]],
                [['Group' => 'By Priority', 'Label' => 'Medium',   'Count' => $data['byPriority']['medium']   ?? 0]],
                [['Group' => 'By Priority', 'Label' => 'Low',      'Count' => $data['byPriority']['low']      ?? 0]],
                array_map(
                    fn ($row) => ['Group' => 'By Section', 'Label' => $row['section'], 'Count' => $row['count']],
                    $data['bySection'] ?? []
                ),
                array_map(
                    fn ($row) => ['Group' => 'By Type', 'Label' => $row['type'], 'Count' => $row['count']],
                    $data['byType'] ?? []
                )
            ),

            'milestone_progress' => array_map(
                fn ($m) => [
                    'Milestone'  => $m['name'],
                    'Runs'       => $m['run_count'],
                    'Done'       => $m['done_count'],
                    '% Done'     => $m['pct_done'],
                    'Due'        => $m['due_on'] ?? '',
                    'Completed'  => $m['is_completed'] ? 'Yes' : 'No',
                ],
                $data['milestones'] ?? []
            ),

            'workload' => array_map(
                fn ($m) => [
                    'Member'          => $m['name'],
                    'Assigned Cases'  => $m['assigned_cases'],
                    'Results Logged'  => $m['results_logged'],
                    'Pass Rate %'     => $m['pass_rate'],
                ],
                $data['members'] ?? []
            ),

            default => [],
        };
    }

    /**
     * Build a CSV download response.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function exportCsv(array $rows, string $filename): HttpResponse
    {
        if (empty($rows)) {
            $csv = '';
        } else {
            $headers = array_keys($rows[0]);
            $lines   = [implode(',', array_map(fn ($h) => $this->csvCell($h), $headers))];
            foreach ($rows as $row) {
                $lines[] = implode(',', array_map(fn ($v) => $this->csvCell((string) $v), array_values($row)));
            }
            $csv = implode("\r\n", $lines);
        }

        return response($csv, 200, [
            'Content-Type'        => 'text/csv; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.csv"',
        ]);
    }

    /**
     * Build an XLSX download response using a minimal hand-crafted SpreadsheetML file.
     * No external library required — pure ZIP + XML.
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function exportXlsx(array $rows, string $filename, string $sheetTitle): HttpResponse
    {
        $sheetTitle = mb_substr(preg_replace('/[\\\/:*?"<>|]/', '', $sheetTitle), 0, 31);

        // ── [Content_Types].xml ───────────────────────────────────────────────
        $contentTypes = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml"    ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml"      ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>';

        // ── _rels/.rels ───────────────────────────────────────────────────────
        $rootRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>';

        // ── xl/_rels/workbook.xml.rels ────────────────────────────────────────
        $wbRels = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet"     Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"        Target="styles.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>';

        // ── xl/workbook.xml ───────────────────────────────────────────────────
        $sheetTitleXml = htmlspecialchars($sheetTitle, ENT_XML1 | ENT_QUOTES, 'UTF-8');
        $workbook = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="' . $sheetTitleXml . '" sheetId="1" r:id="rId1"/></sheets>
</workbook>';

        // ── xl/styles.xml (minimal — 2 styles: normal + bold header) ─────────
        $styles = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="2">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0"/>
  </cellXfs>
</styleSheet>';

        // ── Build shared strings + sheet data ─────────────────────────────────
        $allRows    = empty($rows) ? [] : array_merge([array_keys($rows[0])], array_map('array_values', $rows));
        $stringPool = [];
        $stringIdx  = [];
        $xmlRows    = '';

        foreach ($allRows as $rowIdx => $row) {
            $rowNum  = $rowIdx + 1;
            $isHeader = $rowIdx === 0 && !empty($rows);
            $xmlCols  = '';
            foreach ($row as $colIdx => $cell) {
                $colLetter = $this->xlsxCol($colIdx);
                $cellRef   = $colLetter . $rowNum;
                $val       = (string) $cell;

                if (is_numeric($val) && $val !== '') {
                    $xmlCols .= '<c r="' . $cellRef . '"' . ($isHeader ? ' s="1"' : '') . '><v>' . $val . '</v></c>';
                } else {
                    if (!isset($stringIdx[$val])) {
                        $stringIdx[$val] = count($stringPool);
                        $stringPool[]    = $val;
                    }
                    $si = $stringIdx[$val];
                    $xmlCols .= '<c r="' . $cellRef . '" t="s"' . ($isHeader ? ' s="1"' : '') . '><v>' . $si . '</v></c>';
                }
            }
            $xmlRows .= '<row r="' . $rowNum . '">' . $xmlCols . '</row>';
        }

        // ── xl/sharedStrings.xml ──────────────────────────────────────────────
        $ssItems = '';
        foreach ($stringPool as $s) {
            $ssItems .= '<si><t xml:space="preserve">' . htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8') . '</t></si>';
        }
        $sharedStrings = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="' . count($stringPool) . '" uniqueCount="' . count($stringPool) . '">' . $ssItems . '</sst>';

        // ── xl/worksheets/sheet1.xml ──────────────────────────────────────────
        $sheet = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>' . $xmlRows . '</sheetData>
</worksheet>';

        // ── Pack into ZIP (XLSX = ZIP) ─────────────────────────────────────────
        $tmpFile = tempnam(sys_get_temp_dir(), 'xlsx_');
        $zip     = new \ZipArchive();
        $zip->open($tmpFile, \ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml',         $contentTypes);
        $zip->addFromString('_rels/.rels',                 $rootRels);
        $zip->addFromString('xl/workbook.xml',             $workbook);
        $zip->addFromString('xl/_rels/workbook.xml.rels',  $wbRels);
        $zip->addFromString('xl/styles.xml',               $styles);
        $zip->addFromString('xl/sharedStrings.xml',        $sharedStrings);
        $zip->addFromString('xl/worksheets/sheet1.xml',    $sheet);
        $zip->close();

        $content = file_get_contents($tmpFile);
        unlink($tmpFile);

        return response($content, 200, [
            'Content-Type'        => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.xlsx"',
        ]);
    }

    /**
     * Build a PDF download response (HTML→PDF via browser-renderable HTML
     * wrapped in a print-styled page — no external library required).
     *
     * @param  list<array<string, mixed>>  $rows
     */
    private function exportPdf(array $rows, string $filename, string $title, string $projectName): HttpResponse
    {
        $headerRow = !empty($rows) ? array_keys($rows[0]) : [];
        $esc       = fn (string $v) => htmlspecialchars($v, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');

        $thCells = implode('', array_map(fn ($h) => '<th>' . $esc($h) . '</th>', $headerRow));
        $trRows  = '';
        foreach ($rows as $row) {
            $tds     = implode('', array_map(fn ($v) => '<td>' . $esc((string) $v) . '</td>', array_values($row)));
            $trRows .= '<tr>' . $tds . '</tr>';
        }

        $now  = now()->format('Y-m-d H:i');
        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{$esc($title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  h1 { font-size: 16px; margin-bottom: 2px; }
  .meta { font-size: 10px; color: #666; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1a1a2e; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; }
  tr:nth-child(even) td { background: #f9fafb; }
  @media print { body { padding: 0; } @page { margin: 1.5cm; } }
</style>
</head>
<body>
  <h1>{$esc($title)}</h1>
  <p class="meta">{$esc($projectName)} &mdash; exported {$esc($now)}</p>
  <table>
    <thead><tr>{$thCells}</tr></thead>
    <tbody>{$trRows}</tbody>
  </table>
</body>
</html>
HTML;

        return response($html, 200, [
            'Content-Type'        => 'text/html; charset=UTF-8',
            'Content-Disposition' => 'attachment; filename="' . $filename . '.html"',
            'X-Export-Format'     => 'pdf-printable',
        ]);
    }

    // ── Low-level helpers ─────────────────────────────────────────────────────

    private function csvCell(string $value): string
    {
        if (str_contains($value, ',') || str_contains($value, '"') || str_contains($value, "\n")) {
            return '"' . str_replace('"', '""', $value) . '"';
        }
        return $value;
    }

    private function xlsxCol(int $idx): string
    {
        $col = '';
        for ($i = $idx; $i >= 0; $i = (int) ($i / 26) - 1) {
            $col = chr(65 + ($i % 26)) . $col;
        }
        return $col;
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
