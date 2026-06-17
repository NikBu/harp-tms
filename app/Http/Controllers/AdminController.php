<?php

namespace App\Http\Controllers;

use App\Models\InstanceSetting;
use App\Models\Project;
use App\Models\Suite;
use App\Models\Test;
use App\Models\TestCase;
use App\Models\TestRun;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AdminController extends Controller
{
    /**
     * Roles that may be assigned to a user from the admin panel.
     *
     * @var list<string>
     */
    private const ASSIGNABLE_ROLES = ['admin', 'user'];

    /**
     * Display the administration overview with instance-wide stats.
     */
    public function index(Request $request): Response
    {
        $this->authorizeAdmin($request);

        return Inertia::render('admin/index', [
            'stats' => [
                'users' => User::count(),
                'projects' => Project::count(),
                'test_cases' => TestCase::count(),
                'test_runs' => TestRun::count(),
                'suites' => Suite::count(),
                'tests' => Test::count(),
            ],
        ]);
    }

    /**
     * Display a paginated list of users with their roles.
     */
    public function users(Request $request): Response
    {
        $this->authorizeAdmin($request);

        $users = User::query()
            ->select(['id', 'name', 'email', 'created_at'])
            ->with('roles:id,name')
            ->orderBy('name')
            ->paginate(20)
            ->through(fn (User $user): array => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'roles' => $user->getRoleNames()->toArray(),
                'created_at' => $user->created_at,
            ]);

        return Inertia::render('admin/users', [
            'users' => $users,
            'roles' => self::ASSIGNABLE_ROLES,
        ]);
    }

    /**
     * Update the role assigned to the given user.
     */
    public function updateRole(Request $request, User $user): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'role' => ['required', 'string', 'in:'.implode(',', self::ASSIGNABLE_ROLES)],
        ]);

        $user->syncRoles([$validated['role']]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('admin.role_updated')]);

        return back();
    }

    /**
     * Delete the given user.
     */
    public function deleteUser(Request $request, User $user): RedirectResponse
    {
        $this->authorizeAdmin($request);

        abort_if($user->is($request->user()), 422, __('admin.cannot_delete_self'));

        $user->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('admin.user_deleted')]);

        return back();
    }

    /**
     * Display the site settings form.
     */
    public function settings(Request $request): Response
    {
        $this->authorizeAdmin($request);

        return Inertia::render('admin/settings', [
            'settings' => [
                'site_name' => InstanceSetting::get('site_name', config('app.name')),
                'default_locale' => InstanceSetting::get('default_locale', 'en'),
                'max_projects_per_user' => (int) InstanceSetting::get('max_projects_per_user', 50),
            ],
        ]);
    }

    /**
     * Persist the submitted site settings.
     */
    public function updateSettings(Request $request): RedirectResponse
    {
        $this->authorizeAdmin($request);

        $validated = $request->validate([
            'site_name' => ['required', 'string', 'max:255'],
            'default_locale' => ['required', 'string', 'in:en,ru'],
            'max_projects_per_user' => ['required', 'integer', 'min:1', 'max:1000'],
        ]);

        foreach ($validated as $key => $value) {
            InstanceSetting::set($key, (string) $value);
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('admin.settings_saved')]);

        return back();
    }

    /**
     * Ensure the current user holds the admin role.
     */
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->hasRole('admin'), 403);
    }
}
