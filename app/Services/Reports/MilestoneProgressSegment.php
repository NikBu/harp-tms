<?php

namespace App\Services\Reports;

use Illuminate\Support\Facades\DB;

/**
 * Milestone Progress segment.
 *
 * Returns:
 *  - milestones[]  — each with id, name, due_on, is_completed,
 *                    run_count, done_count, pct_done
 *  - totals        — overall pct_done across all milestones,
 *                    active / completed counts
 */
class MilestoneProgressSegment
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

        $milestones = DB::table('milestones')
            ->whereIn('project_id', $projectIds)
            ->orderBy('due_on')
            ->orderBy('name')
            ->get(['id', 'name', 'due_on', 'is_completed', 'parent_id']);

        $rows = $milestones->map(function ($m): array {
            $runStats = DB::table('test_runs')
                ->where('milestone_id', $m->id)
                ->selectRaw('count(*) as total, sum(case when is_completed then 1 else 0 end) as done')
                ->first();

            $total    = (int) ($runStats->total ?? 0);
            $done     = (int) ($runStats->done  ?? 0);
            $complete = (bool) $m->is_completed;

            return [
                'id'           => $m->id,
                'name'         => $m->name,
                'due_on'       => $m->due_on,
                'parent_id'    => $m->parent_id,
                'is_completed' => $complete,
                'run_count'    => $total,
                'done_count'   => $done,
                'pct_done'     => $total > 0
                    ? round(($done / $total) * 100, 1)
                    : ($complete ? 100.0 : 0.0),
            ];
        })->values()->all();

        $totalMilestones     = count($rows);
        $completedMilestones = collect($rows)->where('is_completed', true)->count();
        $overallPct          = $totalMilestones > 0
            ? round((collect($rows)->sum('pct_done') / $totalMilestones), 1)
            : 0.0;

        return [
            'milestones' => $rows,
            'totals'     => [
                'total'     => $totalMilestones,
                'completed' => $completedMilestones,
                'active'    => $totalMilestones - $completedMilestones,
                'pct_done'  => $overallPct,
            ],
        ];
    }

    /** @return array<string, mixed> */
    private function empty(): array
    {
        return [
            'milestones' => [],
            'totals'     => ['total' => 0, 'completed' => 0, 'active' => 0, 'pct_done' => 0.0],
        ];
    }
}
