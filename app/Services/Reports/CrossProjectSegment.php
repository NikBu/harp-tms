<?php

namespace App\Services\Reports;

use App\Models\Project;
use Illuminate\Support\Collection;

/**
 * Cross-project helper — computes one report type across multiple projects.
 */
class CrossProjectSegment
{
    public function __construct(
        private readonly ActivitySummarySegment $activity,
        private readonly ResultCoverageSegment $coverage,
        private readonly CaseDistributionSegment $distribution,
        private readonly MilestoneProgressSegment $milestones,
        private readonly WorkloadSegment $workload,
    ) {}

    /**
     * @param  Collection<int, Project>  $projects
     * @return array<string, mixed> keyed by project name
     */
    public function compute(Collection $projects, string $type): array
    {
        return $projects->mapWithKeys(function (Project $project) use ($type): array {
            $ids = [$project->id];

            $data = match ($type) {
                'activity_summary' => $this->activity->compute($ids),
                'result_coverage' => $this->coverage->compute($ids),
                'case_distribution' => $this->distribution->compute($ids),
                'milestone_progress' => $this->milestones->compute($ids),
                'workload' => $this->workload->compute($ids),
                default => null,
            };

            return [$project->name => $data];
        })->all();
    }
}
