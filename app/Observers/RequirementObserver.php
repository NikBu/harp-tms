<?php

namespace App\Observers;

use App\Models\Requirement;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class RequirementObserver
{
    public function updating(Requirement $requirement): void
    {
        $trackedFields = [
            'title', 'description', 'type', 'priority',
            'status', 'folder_id', 'assigned_to',
            'external_ref', 'tags',
        ];

        $dirty = array_intersect_key(
            $requirement->getDirty(),
            array_flip($trackedFields)
        );

        if (empty($dirty)) {
            return;
        }

        $entries = [];

        foreach ($dirty as $field => $newValue) {
            $entries[] = [
                'requirement_id' => $requirement->id,
                'changed_by' => Auth::id(),
                'field_name' => $field,
                'old_value' => $this->castForStorage($requirement->getOriginal($field)),
                'new_value' => $this->castForStorage($newValue),
                'created_at' => now(),
            ];
        }

        DB::table('requirement_history')->insert($entries);
    }

    private function castForStorage(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        if (is_array($value)) {
            return json_encode($value);
        }

        return (string) $value;
    }
}
