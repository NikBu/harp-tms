<?php

use App\Models\CustomField;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\Requirement;
use App\Models\Test;
use App\Models\TestCase as TestCaseModel;
use App\Models\TestResult;
use App\Models\User;
use App\Models\Webhook;

it('exposes the expected project suite-mode constants', function () {
    expect(Project::SUITE_SINGLE)->toBe(1)
        ->and(Project::SUITE_SINGLE_BASELINE)->toBe(2)
        ->and(Project::SUITE_MULTI)->toBe(3);
});

it('casts project boolean and datetime columns', function () {
    $casts = (new Project)->getCasts();

    expect($casts)->toMatchArray([
        'show_announcement' => 'boolean',
        'is_completed' => 'boolean',
        'completed_at' => 'datetime',
        'suite_mode' => 'integer',
    ]);
});

it('adds the new user fillable columns and casts', function () {
    $user = new User;

    expect($user->getFillable())->toContain('timezone', 'avatar_url', 'is_active', 'last_login_at')
        ->and($user->getCasts())->toMatchArray([
            'last_login_at' => 'datetime',
            'is_active' => 'boolean',
        ]);
});

it('defines requirement enum constants', function () {
    expect(Requirement::TYPES)->toContain('functional', 'user_story')
        ->and(Requirement::PRIORITIES)->toContain('critical', 'low')
        ->and(Requirement::STATUSES)->toContain('draft', 'approved')
        ->and(Requirement::SOURCES)->toContain('manual', 'jira');
});

it('defines test-case template and status constants', function () {
    expect(TestCaseModel::TEMPLATES)->toContain('steps', 'bdd', 'checklist')
        ->and(TestCaseModel::STATUSES)->toContain('draft', 'review', 'approved');
});

it('shares the status set between Test and TestResult', function () {
    expect(Test::STATUSES)->toBe(TestResult::STATUSES)
        ->and(Test::STATUSES)->toContain('untested', 'passed', 'failed', 'blocked', 'retest', 'skipped');
});

it('lists milestone and custom-field enum constants', function () {
    expect(Milestone::STATUSES)->toContain('upcoming', 'active', 'completed')
        ->and(CustomField::APPLIES_TO)->toBe(['cases', 'results'])
        ->and(CustomField::FIELD_TYPES)->toContain('string', 'dropdown', 'multi_select');
});

it('hides secret-bearing columns from serialization', function () {
    expect((new Webhook)->getHidden())->toContain('secret');
});

it('disables timestamps on append-only models', function () {
    expect(TestResult::UPDATED_AT)->toBeNull();
});
