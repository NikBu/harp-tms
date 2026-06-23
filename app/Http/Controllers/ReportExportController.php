<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Services\Reports\ActivitySummarySegment;
use App\Services\Reports\CaseDistributionSegment;
use App\Services\Reports\DashboardSegment;
use App\Services\Reports\MilestoneProgressSegment;
use App\Services\Reports\ResultCoverageSegment;
use App\Services\Reports\WorkloadSegment;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Carbon;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Handles CSV / XLSX / PDF export of per-project reports and the dashboard.
 */
class ReportExportController extends Controller
{
    private const REPORT_TYPES = [
        'activity_summary',
        'result_coverage',
        'case_distribution',
        'milestone_progress',
        'workload',
    ];

    public function __construct(
        private readonly ActivitySummarySegment $activity,
        private readonly ResultCoverageSegment $coverage,
        private readonly CaseDistributionSegment $distribution,
        private readonly MilestoneProgressSegment $milestones,
        private readonly WorkloadSegment $workload,
        private readonly DashboardSegment $dashboard,
    ) {}

    // ── Per-report export ─────────────────────────────────────────────────

    public function export(Request $request, Project $project, string $type): StreamedResponse|Response
    {
        $user = $request->user();
        if (! $user->hasRole('admin')) {
            abort_unless($project->members()->whereKey($user->getKey())->exists(), 403);
        }

        abort_unless(in_array($type, self::REPORT_TYPES, true), 404);

        $format = strtolower($request->query('format', 'csv'));
        abort_unless(in_array($format, ['csv', 'xlsx', 'pdf'], true), 422);

        $data = $this->compute([$project->id], $type);
        $rows = $this->flatten($type, $data);
        $title = $this->reportTitle($type);
        $stamp = Carbon::now()->format('Ymd_His');
        $name = "{$project->name}_{$type}_{$stamp}";

        return match ($format) {
            'csv' => $this->csv($rows, $title, $name),
            'xlsx' => $this->xlsx($rows, $title, $name),
            'pdf' => $this->pdf($rows, $title, $project->name, $name),
        };
    }

    // ── Dashboard export (XLSX multi-sheet or PDF) ────────────────────────

    public function exportDashboard(Request $request, ?Project $project = null): StreamedResponse|Response
    {
        $user = $request->user();

        if ($project) {
            if (! $user->hasRole('admin')) {
                abort_unless($project->members()->whereKey($user->getKey())->exists(), 403);
            }
            $projects = collect([$project]);
            $scope = $project->name;
        } else {
            $projects = $user->hasRole('admin')
                ? Project::orderBy('name')->get()
                : $user->projects()->orderBy('name')->get();
            $scope = 'Global';
        }

        $format = strtolower($request->query('format', 'xlsx'));
        abort_unless(in_array($format, ['xlsx', 'pdf'], true), 422);

        $data = $this->dashboard->compute($projects);
        $stamp = Carbon::now()->format('Ymd_His');
        $name = "{$scope}_dashboard_{$stamp}";

        return match ($format) {
            'xlsx' => $this->dashboardXlsx($data, $scope, $name),
            'pdf' => $this->dashboardPdf($data, $scope, $name),
        };
    }

    // ── Data helpers ─────────────────────────────────────────────────────────

    private function compute(array $ids, string $type): array
    {
        return match ($type) {
            'activity_summary' => $this->activity->compute($ids),
            'result_coverage' => $this->coverage->compute($ids),
            'case_distribution' => $this->distribution->compute($ids),
            'milestone_progress' => $this->milestones->compute($ids),
            'workload' => $this->workload->compute($ids),
        };
    }

    /**
     * Convert segment data to a 2-D array of rows ready for serialisation.
     * First row = headers.
     *
     * @return list<list<string|int|float>>
     */
    private function flatten(string $type, array $data): array
    {
        return match ($type) {
            'activity_summary' => $this->flattenActivity($data),
            'result_coverage' => $this->flattenCoverage($data),
            'case_distribution' => $this->flattenDistribution($data),
            'milestone_progress' => $this->flattenMilestones($data),
            'workload' => $this->flattenWorkload($data),
            default => [[]],
        };
    }

    private function flattenActivity(array $d): array
    {
        $rows = [['Date', 'New Cases', 'Updated Cases', 'New Results']];
        foreach ($d['daily'] ?? [] as $day) {
            $rows[] = [$day['date'], $day['new_cases'], $day['updated_cases'], $day['new_results']];
        }
        $rows[] = [];
        $rows[] = ['Totals', $d['totals']['new_cases'] ?? 0, $d['totals']['updated_cases'] ?? 0, $d['totals']['new_results'] ?? 0];

        return $rows;
    }

    private function flattenCoverage(array $d): array
    {
        $rows = [['Metric', 'Value']];
        foreach (['passed', 'failed', 'blocked', 'retest', 'skipped', 'untested'] as $k) {
            $rows[] = [ucfirst($k), $d[$k] ?? 0];
        }
        $rows[] = [];
        $rows[] = ['Total Cases', $d['coverage']['total'] ?? 0];
        $rows[] = ['Cases Run',   $d['coverage']['run'] ?? 0];
        $rows[] = ['Never Run',   $d['coverage']['untested'] ?? 0];
        $rows[] = ['Coverage %',  ($d['coverage']['pct'] ?? 0).'%'];
        $rows[] = [];
        $rows[] = ['Priority', 'Passed', 'Total', 'Pass Rate %'];
        foreach ($d['by_priority'] ?? [] as $prio => $v) {
            $rows[] = [ucfirst($prio), $v['passed'] ?? 0, $v['total'] ?? 0, ($v['pct'] ?? 0).'%'];
        }

        return $rows;
    }

    private function flattenDistribution(array $d): array
    {
        $rows = [['Dimension', 'Label', 'Count']];
        foreach (['critical', 'high', 'medium', 'low'] as $p) {
            $rows[] = ['Priority', ucfirst($p), $d['byPriority'][$p] ?? 0];
        }
        $rows[] = ['Priority', 'Total', $d['byPriority']['total'] ?? 0];
        foreach ($d['byTemplate'] ?? [] as $k => $v) {
            $rows[] = ['Template', ucfirst($k), $v];
        }
        foreach ($d['bySection'] ?? [] as $item) {
            $rows[] = ['Section', $item['section'], $item['count']];
        }
        foreach ($d['byType'] ?? [] as $item) {
            $rows[] = ['Type', $item['type'], $item['count']];
        }

        return $rows;
    }

    private function flattenMilestones(array $d): array
    {
        $rows = [['Milestone', 'Due Date', 'Runs', 'Done %', 'Completed']];
        foreach ($d['milestones'] ?? [] as $m) {
            $rows[] = [
                $m['name'],
                $m['due_on'] ?? '',
                $m['run_count'],
                $m['pct_done'].'%',
                $m['is_completed'] ? 'Yes' : 'No',
            ];
        }
        $rows[] = [];
        $t = $d['totals'] ?? [];
        $rows[] = ['Total Milestones', $t['total'] ?? 0, '', '', ''];
        $rows[] = ['Completed',        $t['completed'] ?? 0, '', '', ''];
        $rows[] = ['Active',           $t['active'] ?? 0, '', '', ''];
        $rows[] = ['Overall Done %',   ($t['pct_done'] ?? 0).'%', '', '', ''];

        return $rows;
    }

    private function flattenWorkload(array $d): array
    {
        $rows = [['Member', 'Assigned Cases', 'Results Logged', 'Pass Rate %', 'Passed', 'Failed', 'Blocked', 'Retest', 'Skipped', 'Untested']];
        foreach ($d['members'] ?? [] as $m) {
            $s = $m['statuses'] ?? [];
            $rows[] = [
                $m['name'],
                $m['assigned_cases'],
                $m['results_logged'],
                $m['pass_rate'].'%',
                $s['passed'] ?? 0,
                $s['failed'] ?? 0,
                $s['blocked'] ?? 0,
                $s['retest'] ?? 0,
                $s['skipped'] ?? 0,
                $s['untested'] ?? 0,
            ];
        }

        return $rows;
    }

    // ── Dashboard flatten helpers ─────────────────────────────────────────

    private function dashboardSheets(array $d): array
    {
        $sheets = [];

        // 1. Run Summary
        $rows = [['Run Name', 'Passed', 'Failed', 'Blocked', 'Retest', 'Skipped', 'Untested', 'Total', '% Passed', 'Completed', 'Created']];
        foreach ($d['runs'] as $r) {
            $b = $r['breakdown'];
            $rows[] = [
                $r['name'],
                $b['passed'], $b['failed'], $b['blocked'],
                $b['retest'], $b['skipped'], $b['untested'],
                $r['total'], $r['pct_passed'].'%',
                $r['is_completed'] ? 'Yes' : 'No',
                $r['created_at'] ? Carbon::parse($r['created_at'])->format('Y-m-d') : '',
            ];
        }
        $totals = $d['statusTotals'];
        $rows[] = [];
        $rows[] = ['TOTALS', $totals['passed'], $totals['failed'], $totals['blocked'], $totals['retest'], $totals['skipped'], $totals['untested'], '', '', '', ''];
        $sheets['Run Summary'] = $rows;

        // 2. Activity (last 30 days)
        $rows = [['Date', 'Passed', 'Failed', 'Blocked', 'Retest', 'Skipped', 'Untested']];
        foreach ($d['activity'] as $day) {
            $rows[] = [$day['date'], $day['passed'], $day['failed'], $day['blocked'], $day['retest'], $day['skipped'], $day['untested']];
        }
        $sheets['Activity (30d)'] = $rows;

        // 3. Coverage
        $rows = [
            ['Metric', 'Value'],
            ['Total Cases',   $d['coverage']['total']],
            ['Cases Run',     $d['coverage']['run']],
            ['Never Run',     $d['coverage']['untested']],
            ['Coverage %',    $d['coverage']['pct'].'%'],
            [],
            ['Section', 'Tested', 'Untested'],
        ];
        foreach ($d['sectionCoverage'] as $s) {
            $rows[] = [$s['section'], $s['tested'], $s['untested']];
        }
        $sheets['Coverage'] = $rows;

        // 4. Milestones
        $rows = [['Milestone', 'Due Date', 'Run Count', '% Done', 'Completed']];
        foreach ($d['milestones'] as $m) {
            $rows[] = [
                $m['name'],
                $m['due_on'] ?? '',
                $m['run_count'],
                $m['pct_done'].'%',
                $m['is_completed'] ? 'Yes' : 'No',
            ];
        }
        $sheets['Milestones'] = $rows;

        // 5. Workload
        $rows = [['Member', 'Assigned Cases', 'Results Logged']];
        foreach ($d['workload'] as $w) {
            $rows[] = [$w['name'], $w['assigned_cases'], $w['results_logged']];
        }
        $sheets['Workload'] = $rows;

        return $sheets;
    }

    private function dashboardXlsx(array $data, string $scope, string $name): StreamedResponse
    {
        $sheets = $this->dashboardSheets($data);
        $xml = $this->buildMultiSheetXlsx($sheets);

        return response()->streamDownload(function () use ($xml) {
            echo $xml;
        }, "{$name}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$name}.xlsx\"",
        ]);
    }

    private function dashboardPdf(array $data, string $scope, string $name): StreamedResponse
    {
        $sheets = $this->dashboardSheets($data);
        $date = Carbon::now()->format('d M Y, H:i');

        $sections = '';
        foreach ($sheets as $title => $rows) {
            if (empty($rows)) {
                continue;
            }
            $thead = '';
            $tbody = '';
            foreach ($rows as $i => $row) {
                if ($row === []) {
                    $tbody .= '<tr class="spacer"><td colspan="99"></td></tr>';

                    continue;
                }
                $cells = array_map(fn ($v) => '<td>'.htmlspecialchars((string) $v, ENT_HTML5).'</td>', $row);
                if ($i === 0) {
                    $hcells = array_map(fn ($v) => '<th>'.htmlspecialchars((string) $v, ENT_HTML5).'</th>', $row);
                    $thead = '<thead><tr>'.implode('', $hcells).'</tr></thead>';
                } else {
                    $tbody .= '<tr>'.implode('', $cells).'</tr>';
                }
            }
            $sections .= "<h2>{$title}</h2><table>{$thead}<tbody>{$tbody}</tbody></table>";
        }

        $html = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dashboard — {$scope}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; padding: 2cm; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  h2 { font-size: 14px; margin: 24px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  th { background: #f3f3f3; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr.spacer td { padding: 8px 0; border: none; }
  @media print {
    @page { margin: 1.5cm; }
    body { padding: 0; }
    h2 { page-break-before: auto; }
    .no-print { display: none; }
  }
  .print-btn { margin-bottom: 16px; }
  button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
</style>
</head>
<body>
<div class="print-btn no-print">
  <button onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<h1>Dashboard Report</h1>
<p class="meta">{$scope} &nbsp;·&nbsp; Generated {$date}</p>
{$sections}
</body>
</html>
HTML;

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, "{$name}.html", [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$name}.html\"",
            'X-Export-Note' => 'Open in browser and use Print > Save as PDF',
        ]);
    }

    private function reportTitle(string $type): string
    {
        return match ($type) {
            'activity_summary' => 'Activity Summary',
            'result_coverage' => 'Result Coverage',
            'case_distribution' => 'Case Distribution',
            'milestone_progress' => 'Milestone Progress',
            'workload' => 'Workload',
            default => ucwords(str_replace('_', ' ', $type)),
        };
    }

    // ── Format renderers ─────────────────────────────────────────────────────

    private function csv(array $rows, string $title, string $name): StreamedResponse
    {
        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($out, array_map('strval', $row));
            }
            fclose($out);
        }, "{$name}.csv", [
            'Content-Type' => 'text/csv; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$name}.csv\"",
        ]);
    }

    private function xlsx(array $rows, string $title, string $name): StreamedResponse
    {
        $xml = $this->buildXlsx($rows, $title);

        return response()->streamDownload(function () use ($xml) {
            echo $xml;
        }, "{$name}.xlsx", [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition' => "attachment; filename=\"{$name}.xlsx\"",
        ]);
    }

    private function pdf(array $rows, string $title, string $projectName, string $name): StreamedResponse
    {
        $html = $this->buildPdfHtml($rows, $title, $projectName);

        return response()->streamDownload(function () use ($html) {
            echo $html;
        }, "{$name}.html", [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Disposition' => "attachment; filename=\"{$name}.html\"",
            'X-Export-Note' => 'Open in browser and use Print > Save as PDF',
        ]);
    }

    // ── XLSX builder (single sheet) ──────────────────────────────────────────

    private function buildXlsx(array $rows, string $sheetName): string
    {
        return $this->buildMultiSheetXlsx([$sheetName => $rows]);
    }

    // ── XLSX builder (multi-sheet) ───────────────────────────────────────────

    private function buildMultiSheetXlsx(array $sheets): string
    {
        $strings = [];
        $strIndex = [];
        $sheetXmls = [];
        $sheetNames = array_keys($sheets);

        foreach ($sheets as $sheetName => $rows) {
            $cellRows = [];
            foreach ($rows as $ri => $row) {
                $cellRow = [];
                foreach ($row as $ci => $val) {
                    $col = $this->xlsxColLetter($ci);
                    $ref = $col.($ri + 1);
                    if ($val === '' || $val === null) {
                        $cellRow[] = "<c r=\"{$ref}\"/>";

                        continue;
                    }
                    if (is_numeric($val) && ! str_starts_with((string) $val, '0')) {
                        $cellRow[] = "<c r=\"{$ref}\" t=\"n\"><v>{$val}</v></c>";
                    } else {
                        $s = (string) $val;
                        if (! isset($strIndex[$s])) {
                            $strIndex[$s] = count($strings);
                            $strings[] = htmlspecialchars($s, ENT_XML1);
                        }
                        $idx = $strIndex[$s];
                        $cellRow[] = "<c r=\"{$ref}\" t=\"s\"><v>{$idx}</v></c>";
                    }
                }
                $rNum = $ri + 1;
                $cellRows[] = '<row r="'.$rNum.'">'.implode('', $cellRow).'</row>';
            }
            $sheetXmls[$sheetName] = implode('', $cellRows);
        }

        $sharedStrings = implode('', array_map(fn ($s) => "<si><t>{$s}</t></si>", $strings));
        $ssCount = count($strings);

        $tmp = tempnam(sys_get_temp_dir(), 'xlsx');
        $zip = new \ZipArchive;
        $zip->open($tmp, \ZipArchive::OVERWRITE);

        // Build sheet entries
        $sheetEntries = '';
        $sheetRels = '';
        $overrides = '';
        $i = 1;
        foreach ($sheetNames as $name) {
            $safe = htmlspecialchars($name, ENT_XML1);
            $sheetEntries .= "<sheet name=\"{$safe}\" sheetId=\"{$i}\" r:id=\"rId{$i}\"/>";
            $sheetRels .= "<Relationship Id=\"rId{$i}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet\" Target=\"worksheets/sheet{$i}.xml\"/>";
            $overrides .= "<Override PartName=\"/xl/worksheets/sheet{$i}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml\"/>";
            $i++;
        }
        $ssRel = "<Relationship Id=\"rId{$i}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings\" Target=\"sharedStrings.xml\"/>";

        $zip->addFromString('[Content_Types].xml',
            '<?xml version="1.0" encoding="UTF-8"?>'.
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'.
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'.
            '<Default Extension="xml" ContentType="application/xml"/>'.
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'.
            '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>'.
            $overrides.
            '</Types>');

        $zip->addFromString('_rels/.rels',
            '<?xml version="1.0" encoding="UTF-8"?>'.
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'.
            '</Relationships>');

        $zip->addFromString('xl/_rels/workbook.xml.rels',
            '<?xml version="1.0" encoding="UTF-8"?>'.
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'.
            $sheetRels.$ssRel.
            '</Relationships>');

        $zip->addFromString('xl/workbook.xml',
            '<?xml version="1.0" encoding="UTF-8"?>'.
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'.
            "<sheets>{$sheetEntries}</sheets>".
            '</workbook>');

        $zip->addFromString('xl/sharedStrings.xml',
            '<?xml version="1.0" encoding="UTF-8"?>'.
            "<sst xmlns=\"http://schemas.openxmlformats.org/spreadsheetml/2006/main\" count=\"{$ssCount}\" uniqueCount=\"{$ssCount}\">{$sharedStrings}</sst>");

        $sheetIdx = 1;
        foreach ($sheetXmls as $sheetData) {
            $zip->addFromString("xl/worksheets/sheet{$sheetIdx}.xml",
                '<?xml version="1.0" encoding="UTF-8"?>'.
                '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'.
                "<sheetData>{$sheetData}</sheetData>".
                '</worksheet>');
            $sheetIdx++;
        }

        $zip->close();
        $content = file_get_contents($tmp);
        unlink($tmp);

        return $content;
    }

    private function xlsxColLetter(int $n): string
    {
        $letter = '';
        $n++;
        while ($n > 0) {
            $letter = chr(65 + ($n - 1) % 26).$letter;
            $n = intdiv($n - 1, 26);
        }

        return $letter;
    }

    // ── Print-to-PDF HTML builder ─────────────────────────────────────────────

    private function buildPdfHtml(array $rows, string $title, string $projectName): string
    {
        $date = Carbon::now()->format('d M Y, H:i');
        $thead = '';
        $tbody = '';

        foreach ($rows as $i => $row) {
            if ($row === []) {
                $tbody .= '<tr class="spacer"><td colspan="99"></td></tr>';

                continue;
            }
            $cells = array_map(fn ($v) => '<td>'.htmlspecialchars((string) $v, ENT_HTML5).'</td>', $row);
            $line = '<tr>'.implode('', $cells).'</tr>';
            if ($i === 0) {
                $hcells = array_map(fn ($v) => '<th>'.htmlspecialchars((string) $v, ENT_HTML5).'</th>', $row);
                $thead = '<thead><tr>'.implode('', $hcells).'</tr></thead>';
            } else {
                $tbody .= $line;
            }
        }

        return <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>{$title} — {$projectName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; font-size: 12px; color: #111; padding: 2cm; }
  h1 { font-size: 18px; margin-bottom: 4px; }
  .meta { color: #666; font-size: 11px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #f3f3f3; font-weight: 600; text-align: left; padding: 6px 8px; border-bottom: 2px solid #ddd; }
  td { padding: 5px 8px; border-bottom: 1px solid #eee; }
  tr.spacer td { padding: 8px 0; border: none; }
  @media print {
    @page { margin: 1.5cm; }
    body { padding: 0; }
    .no-print { display: none; }
  }
  .print-btn { margin-bottom: 16px; }
  button { padding: 6px 14px; font-size: 13px; cursor: pointer; }
</style>
</head>
<body>
<div class="print-btn no-print">
  <button onclick="window.print()">🖨 Print / Save as PDF</button>
</div>
<h1>{$title}</h1>
<p class="meta">{$projectName} &nbsp;·&nbsp; Generated {$date}</p>
<table>
  {$thead}
  <tbody>{$tbody}</tbody>
</table>
</body>
</html>
HTML;
    }
}
