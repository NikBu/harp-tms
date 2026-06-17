<?php

namespace App\Services\Reports;

use App\Models\TestCase;
use Illuminate\Support\Facades\DB;

/**
 * Case Distribution segment.
 *
 * Returns:
 *  - by_priority  { critical, high, medium, low, total }
 *  - by_type      list of { type, count }
 *  - by_section   list of { section, count } (top 15)
 *  - by_template  { text, steps, exploratory, bdd, checklist }
 */
class CaseDistributionSegment
{
    /**
     * @param  list<int>  $projectIds
     * @return array<string, mixed>
     */
    public function compute(array $projectIds): array
    {
        if ($projectIds === []) {
            return $this->empty();
        }

        // By priority
        $byPriorityRaw = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNull('test_cases.deleted_at')
            ->selectRaw('priority, count(*) as cnt')
            ->groupBy('priority')
            ->pluck('cnt', 'priority');

        $byPriority = [
            'critical' => (int) ($byPriorityRaw['critical'] ?? 0),
            'high'     => (int) ($byPriorityRaw['high']     ?? 0),
            'medium'   => (int) ($byPriorityRaw['medium']   ?? 0),
            'low'      => (int) ($byPriorityRaw['low']      ?? 0),
            'total'    => (int) $byPriorityRaw->sum(),
        ];

        // By case_type (the actual column name in the DB)
        $byTypeRaw = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNotNull('test_cases.case_type')
            ->whereNull('test_cases.deleted_at')
            ->selectRaw('test_cases.case_type as type, count(*) as cnt')
            ->groupBy('test_cases.case_type')
            ->orderByDesc('cnt')
            ->get();

        $byType = $byTypeRaw->map(fn ($r) => [
            'type'  => (string) $r->type,
            'count' => (int) $r->cnt,
        ])->values()->all();

        // By section (top 15)
        $bySectionRaw = DB::table('test_cases')
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->leftJoin('sections', 'test_cases.section_id', '=', 'sections.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNull('test_cases.deleted_at')
            ->selectRaw('COALESCE(sections.name, ?) as section_name, count(*) as cnt', [__('sections.default_name')])
            ->groupBy('section_name')
            ->orderByDesc('cnt')
            ->limit(15)
            ->get();

        $bySection = $bySectionRaw->map(fn ($r) => [
            'section' => (string) $r->section_name,
            'count'   => (int) $r->cnt,
        ])->values()->all();

        // By template
        $byTemplateRaw = TestCase::query()
            ->join('suites', 'test_cases.suite_id', '=', 'suites.id')
            ->whereIn('suites.project_id', $projectIds)
            ->whereNull('test_cases.deleted_at')
            ->selectRaw('template, count(*) as cnt')
            ->groupBy('template')
            ->pluck('cnt', 'template');

        $byTemplate = [
            'text'         => (int) ($byTemplateRaw['text']         ?? 0),
            'steps'        => (int) ($byTemplateRaw['steps']        ?? 0),
            'exploratory'  => (int) ($byTemplateRaw['exploratory']  ?? 0),
            'bdd'          => (int) ($byTemplateRaw['bdd']          ?? 0),
            'checklist'    => (int) ($byTemplateRaw['checklist']    ?? 0),
        ];

        return compact('byPriority', 'byType', 'bySection', 'byTemplate');
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        return [
            'byPriority' => ['critical' => 0, 'high' => 0, 'medium' => 0, 'low' => 0, 'total' => 0],
            'byType'     => [],
            'bySection'  => [],
            'byTemplate' => ['text' => 0, 'steps' => 0, 'exploratory' => 0, 'bdd' => 0, 'checklist' => 0],
        ];
    }
}
