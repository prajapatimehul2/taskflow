import { TaskRow } from "@/components/tasks/task-row";
import type { CategoryOption } from "@/components/tasks/task-form-dialog";
import type { TaskWithCategory } from "@/lib/data/tasks";

type TaskListProps = {
  tasks: TaskWithCategory[];
  categories: CategoryOption[];
};

export function TaskList({ tasks, categories }: TaskListProps) {
  return (
    <div className="space-y-0.5">
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} categories={categories} />
      ))}
    </div>
  );
}
