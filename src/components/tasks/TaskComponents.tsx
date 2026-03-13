"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Plus, Search, ChevronDown, ChevronUp, Pencil, Trash2, User2, ClipboardCheck, ListChecks, CheckCircle2, ArchiveRestore } from "lucide-react";
import Button from "../ui/button/Button";
import TasksSkeleton from "./TasksSkeleton";
import TaskFormModal from "./TaskFormModal";
import { TASKS_ENDPOINT, TASK_BY_ID_ENDPOINT } from "@/constant/api-endpoints";

// ── Types ─────────────────────────────────────────────────────────

type TaskTab = "mine" | "assigned" | "all" | "completed";

interface TaskUser {
    id: number;
    name: string;
}

interface TaskCase {
    id: number;
    title: string;
    number?: string;
}

interface SubTask {
    id: number;
    title: string;
    completed: boolean;
    status: string;
    priority: string;
    assignedUser: TaskUser;
}

interface Task {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    completed: boolean;
    completedAt: string | null;
    dueDate: string;
    createdAt: string;
    caseId: number;
    assignedUser: TaskUser;
    createdByUser: TaskUser;
    case: TaskCase;
    subTasks: SubTask[];
}

const TABS: { key: TaskTab; label: string }[] = [
    { key: "mine", label: "Mis Tareas" },
    { key: "assigned", label: "Asignadas por mí" },
    { key: "all", label: "Todas" },
    { key: "completed", label: "Completadas" },
];

const PRIORITY_OPTIONS = [
    { value: "todas", label: "Todas las prioridades" },
    { value: "urgente", label: "Urgente" },
    { value: "alta", label: "Alta" },
    { value: "media", label: "Media" },
    { value: "baja", label: "Baja" },
];

const PRIORITY_COLORS: Record<string, string> = {
    urgente: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    alta: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    media: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
    baja: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
    vencido: { label: "VENCIDA", className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-700" },
};

// ── Helpers ────────────────────────────────────────────────────────

function capitalize(s: string) {
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

// ── Empty States ──────────────────────────────────────────────────

const EMPTY_STATES: Record<TaskTab, { icon: React.ElementType; title: string; description: string }> = {
    mine: {
        icon: ListChecks,
        title: "No tienes tareas pendientes",
        description: "Las tareas que te asignen aparecerán aquí",
    },
    assigned: {
        icon: ClipboardCheck,
        title: "No asignaste tareas a otros",
        description: "Las tareas que asignes a otros miembros aparecerán aquí",
    },
    all: {
        icon: ArchiveRestore,
        title: "No hay tareas",
        description: "Aún no se crearon tareas en el sistema",
    },
    completed: {
        icon: CheckCircle2,
        title: "No hay tareas completadas",
        description: "Las tareas que se completen aparecerán aquí",
    },
};

function EmptyState({ tab, onNewTask }: { tab: TaskTab; onNewTask: () => void }) {
    const { icon: Icon, title, description } = EMPTY_STATES[tab];
    return (
        <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3">
            <Icon className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{title}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{description}</p>
            <Button
                variant="primary"
                size="sm"
                className="mt-4"
                onClick={onNewTask}
            >
                Nueva Tarea
            </Button>
        </div>
    );
}

// ── Main Component ────────────────────────────────────────────────

export default function TaskComponents() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [activeTab, setActiveTab] = useState<TaskTab>("mine");
    const [searchTerm, setSearchTerm] = useState("");
    const [priority, setPriority] = useState("todas");
    const [caseFilter, setCaseFilter] = useState<number | undefined>(undefined);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [quickTitle, setQuickTitle] = useState("");
    const [newSubtaskTitle, setNewSubtaskTitle] = useState<Record<number, string>>({});
    const [showForm, setShowForm] = useState(false);

    const token = session?.user?.accessToken;

    const headers = useCallback(() => ({
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    }), [token]);

    // Extraer casos únicos de las tasks para el filtro
    const casesFromTasks = useMemo(() => {
        const map = new Map<number, string>();
        tasks.forEach((t) => {
            if (t.case?.id && t.case?.title) map.set(t.case.id, t.case.title);
        });
        return Array.from(map, ([id, title]) => ({ id, title }));
    }, [tasks]);

    // ── Fetch tasks ───────────────────────────────────────────────
    const fetchTasks = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ tab: activeTab });
            if (searchTerm) params.set("search", searchTerm);
            if (priority !== "todas") params.set("priority", priority);
            if (caseFilter) params.set("caseId", String(caseFilter));

            const res = await fetch(`${TASKS_ENDPOINT}?${params}`, { headers: headers() });
            if (res.ok) {
                const json = await res.json();
                setTasks(json.data);
            }
        } catch (err) {
            console.error("Error fetching tasks:", err);
        } finally {
            setIsLoading(false);
        }
    }, [token, activeTab, searchTerm, priority, caseFilter, headers]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    // ── Quick add task ────────────────────────────────────────────
    const handleQuickAdd = async () => {
        if (!quickTitle.trim() || !token) return;
        if (casesFromTasks.length === 0) {
            toast.error("No hay casos disponibles para asignar la tarea");
            return;
        }
        try {
            const res = await fetch(TASKS_ENDPOINT, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ title: quickTitle.trim(), caseId: casesFromTasks[0].id }),
            });
            if (res.ok) {
                setQuickTitle("");
                fetchTasks();
                toast.success("Tarea creada");
            }
        } catch (err) {
            toast.error("Error al crear tarea");
        }
    };

    // ── Add subtask ───────────────────────────────────────────────
    const handleAddSubtask = async (parentId: number) => {
        const title = newSubtaskTitle[parentId]?.trim();
        if (!title || !token) return;
        try {
            const res = await fetch(TASKS_ENDPOINT, {
                method: "POST",
                headers: headers(),
                body: JSON.stringify({ title, parentTaskId: parentId }),
            });
            if (res.ok) {
                setNewSubtaskTitle((prev) => ({ ...prev, [parentId]: "" }));
                fetchTasks();
            }
        } catch (err) {
            toast.error("Error al crear subtarea");
        }
    };

    // ── Toggle complete ───────────────────────────────────────────
    const handleToggleComplete = async (task: Task | SubTask) => {
        if (!token) return;
        try {
            const res = await fetch(TASK_BY_ID_ENDPOINT(task.id), {
                method: "PUT",
                headers: headers(),
                body: JSON.stringify({ completed: !task.completed }),
            });
            if (res.ok) fetchTasks();
        } catch (err) {
            toast.error("Error al actualizar tarea");
        }
    };

    // ── Delete task ───────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        if (!token) return;
        try {
            const res = await fetch(TASK_BY_ID_ENDPOINT(id), {
                method: "DELETE",
                headers: headers(),
            });
            if (res.ok) {
                fetchTasks();
                toast.success("Tarea eliminada");
                if (expandedId === id) setExpandedId(null);
            }
        } catch (err) {
            toast.error("Error al eliminar tarea");
        }
    };

    // ── Tab change ────────────────────────────────────────────────
    const handleTabChange = (tab: TaskTab) => {
        setActiveTab(tab);
        setExpandedId(null);
    };

    if (isLoading && tasks.length === 0) return <TasksSkeleton />;

    return (
        <div className="flex flex-col gap-6 mb-2">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Tareas</h1>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="flex gap-6 -mb-px">
                    {TABS.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => handleTabChange(tab.key)}
                            className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.key
                                    ? "border-brand-500 text-brand-500"
                                    : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-gray-600"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Quick add */}
            <div className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-4 py-3">
                <input
                    type="text"
                    value={quickTitle}
                    onChange={(e) => setQuickTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
                    placeholder="Agregar tarea rápida..."
                    className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
                />
                <button
                    onClick={handleQuickAdd}
                    className="text-gray-400 hover:text-brand-500 transition-colors"
                >
                    <Plus className="h-5 w-5" />
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-50 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar tareas..."
                        className="w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 py-2 pl-9 pr-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-brand-500"
                    />
                </div>
                <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500"
                >
                    {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                </select>
                <select
                    value={caseFilter ?? ""}
                    onChange={(e) => setCaseFilter(e.target.value ? Number(e.target.value) : undefined)}
                    className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 outline-none focus:border-brand-500 max-w-50"
                >
                    <option value="">Todos los casos</option>
                    {casesFromTasks.map((c) => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                </select>
            </div>

            {/* Task list */}
            <div className="flex flex-col gap-3">
                {tasks.length === 0 && !isLoading ? (
                    <EmptyState tab={activeTab} onNewTask={() => setShowForm(true)} />
                ) : (
                    tasks.map((task) => {
                        const isExpanded = expandedId === task.id;
                        return (
                            <div
                                key={task.id}
                                className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-white/3"
                            >
                                {/* Task row */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {/* Checkbox */}
                                    <input
                                        type="checkbox"
                                        checked={task.completed}
                                        onChange={() => handleToggleComplete(task)}
                                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 shrink-0 cursor-pointer"
                                    />

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold ${task.completed ? "line-through text-gray-400" : "text-gray-900 dark:text-white"}`}>
                                            {task.title}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            {/* Priority badge */}
                                            <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${PRIORITY_COLORS[task.priority] ?? "bg-gray-100 text-gray-600"}`}>
                                                {capitalize(task.priority)}
                                            </span>

                                            {/* Status badge (vencida) */}
                                            {STATUS_BADGES[task.status] && (
                                                <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_BADGES[task.status].className}`}>
                                                    ⚠ {STATUS_BADGES[task.status].label}
                                                </span>
                                            )}

                                            {/* Assigned user */}
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                <User2 className="h-3.5 w-3.5" />
                                                {task.assignedUser.name}
                                            </span>

                                            {/* Expediente */}
                                            {task.case && (
                                                <a href={`/admin/legal-cases/${task.case.id}`} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                                    {task.case.number ? `${task.case.number} - ${task.case.title}` : task.case.title}
                                                </a>
                                            )}
                                        </div>
                                    </div>

                                    {/* Expand toggle */}
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : task.id)}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 shrink-0"
                                    >
                                        {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                                    </button>
                                </div>

                                {/* Expanded content */}
                                {isExpanded && (
                                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-4 space-y-4">
                                        {/* Subtasks */}
                                        <div>
                                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
                                                <ChevronDown className="h-3.5 w-3.5" /> Subtareas
                                            </p>
                                            {task.subTasks.length > 0 && (
                                                <ul className="space-y-1.5 mb-2">
                                                    {task.subTasks.map((sub) => (
                                                        <li key={sub.id} className="flex items-center gap-2 pl-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={sub.completed}
                                                                onChange={() => handleToggleComplete(sub)}
                                                                className="h-3.5 w-3.5 rounded border-gray-300 text-brand-500 focus:ring-brand-500 cursor-pointer"
                                                            />
                                                            <span className={`text-sm ${sub.completed ? "line-through text-gray-400" : "text-gray-700 dark:text-gray-300"}`}>
                                                                {sub.title}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newSubtaskTitle[task.id] ?? ""}
                                                    onChange={(e) => setNewSubtaskTitle((prev) => ({ ...prev, [task.id]: e.target.value }))}
                                                    onKeyDown={(e) => e.key === "Enter" && handleAddSubtask(task.id)}
                                                    placeholder="Agregar subtarea..."
                                                    className="flex-1 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-1.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none focus:border-brand-500"
                                                />
                                                <button
                                                    onClick={() => handleAddSubtask(task.id)}
                                                    className="text-gray-400 hover:text-brand-500 transition-colors"
                                                >
                                                    <Plus className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Meta + Actions */}
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-blue-500">
                                                Creada el {formatDateTime(task.createdAt)}
                                            </p>
                                            <div className="flex items-center gap-2">
                                                <button className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                                    <Pencil className="h-3.5 w-3.5" /> Editar
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(task.id)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal Nueva Tarea */}
            <TaskFormModal
                isOpen={showForm}
                onClose={() => setShowForm(false)}
                onCreated={fetchTasks}
            />
        </div>
    );
}
