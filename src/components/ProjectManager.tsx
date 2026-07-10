import React, { useState, useEffect } from 'react';
import { Project, ProjectVersion, FloorPlan } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { Folder, Plus, Trash2, X, History, Save, GitCompare } from 'lucide-react';
import { useToast } from './Toast';

interface ProjectManagerProps {
  currentPlan: FloorPlan;
  onLoadPlan: (plan: FloorPlan) => void;
  onClose: () => void;
}

export function ProjectManager({ currentPlan, onLoadPlan, onClose }: ProjectManagerProps) {
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([]);

  // Load projects from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('vastu_projects');
    if (saved) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setProjects(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse projects', e);
      }
    }
  }, []);

  // Persist to localStorage. QuotaExceededError can fire when the projects
  // list is large (50+ versions × 200 rooms each) — surface a toast instead
  // of letting the throw bubble into React's render loop.
  const saveProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    try {
      localStorage.setItem('vastu_projects', JSON.stringify(newProjects));
    } catch (e) {
      const isQuota =
        e instanceof DOMException &&
        // Most browsers: QuotaExceededError. Older Safari: code 22.
        (e.name === 'QuotaExceededError' || e.code === 22);
      showToast(
        isQuota
          ? 'Browser storage is full — could not save the project. Try deleting old projects or versions.'
          : 'Could not save the project to local storage.',
        'error'
      );
    }
  };

  const handleCreateProject = () => {
    if (!newProjectName.trim()) return;

    const newProject: Project = {
      id: uuidv4(),
      name: newProjectName,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      versions: [
        {
          id: uuidv4(),
          name: 'V1',
          timestamp: Date.now(),
          plan: currentPlan,
        },
      ],
    };

    saveProjects([newProject, ...projects]);
    setNewProjectName('');
  };

  const handleSaveVersion = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;

    const newVersionName = `V${project.versions.length + 1}`;
    const newVersion: ProjectVersion = {
      id: uuidv4(),
      name: newVersionName,
      timestamp: Date.now(),
      plan: currentPlan,
    };

    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          updatedAt: Date.now(),
          versions: [newVersion, ...p.versions],
        };
      }
      return p;
    });

    saveProjects(updatedProjects);
  };

  const handleDeleteProject = (projectId: string) => {
    saveProjects(projects.filter((p) => p.id !== projectId));
    if (activeProjectId === projectId) setActiveProjectId(null);
  };

  const handleDeleteVersion = (projectId: string, versionId: string) => {
    const updatedProjects = projects.map((p) => {
      if (p.id === projectId) {
        return {
          ...p,
          versions: p.versions.filter((v) => v.id !== versionId),
        };
      }
      return p;
    });
    saveProjects(updatedProjects);
  };

  const handleLoadVersion = (version: ProjectVersion) => {
    onLoadPlan(version.plan);
    onClose();
  };

  const compareVersions = (v1: ProjectVersion, v2: ProjectVersion) => {
    const diff: Record<string, number> = {
      rooms: Math.abs(v1.plan.rooms.length - v2.plan.rooms.length),
    };
    return diff;
  };

  return (
    <div className="fixed inset-0 bg-fg/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-bg rounded-2xl shadow-elev-raised w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-border-soft flex items-center justify-between bg-bg">
          <h2 className="text-lg font-bold text-fg-2 flex items-center gap-2">
            <Folder className="w-5 h-5 text-accent" />
            Project Manager
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-meta hover:text-muted hover:bg-surface rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Projects List */}
          <div className="w-1/3 border-r border-border-soft bg-surface-warm/50 flex flex-col">
            <div className="p-4 border-b border-border-soft">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New Project Name..."
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                />
                <button
                  onClick={handleCreateProject}
                  disabled={!newProjectName.trim()}
                  className="p-2 bg-accent text-accent-on rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-meta text-sm">
                  No projects yet. Create one above!
                </div>
              ) : (
                projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setActiveProjectId(project.id)}
                    className={`p-3 rounded-lg cursor-pointer mb-1 flex items-center justify-between group transition-colors ${activeProjectId === project.id ? 'bg-accent/10 border border-accent/20' : 'hover:bg-surface-warm border border-transparent'}`}
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <Folder
                        className={`w-4 h-4 shrink-0 ${activeProjectId === project.id ? 'text-accent' : 'text-meta'}`}
                      />
                      <div className="truncate">
                        <div
                          className={`text-sm font-medium truncate ${activeProjectId === project.id ? 'text-accent' : 'text-fg-2'}`}
                        >
                          {project.name}
                        </div>
                        <div className="text-[10px] text-muted">
                          {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteProject(project.id);
                      }}
                      className="p-1.5 text-meta hover:text-danger hover:bg-danger/10 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Area - Versions */}
          <div className="flex-1 bg-bg flex flex-col">
            {activeProjectId ? (
              <>
                <div className="p-4 border-b border-border-soft flex items-center justify-between">
                  <h3 className="font-semibold text-fg-2 flex items-center gap-2">
                    <History className="w-4 h-4 text-meta" />
                    Version History
                  </h3>
                  <button
                    onClick={() => handleSaveVersion(activeProjectId)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success hover:bg-success/15 rounded-lg text-sm font-medium transition-colors border border-success/30"
                  >
                    <Save className="w-4 h-4" />
                    Save Current as New Version
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="space-y-3">
                    {projects
                      .find((p) => p.id === activeProjectId)
                      ?.versions.map((version, idx) => (
                        <div
                          key={version.id}
                          className="flex items-center justify-between p-4 border border-border-soft rounded-xl hover:border-accent/20 hover:shadow-elev-ring transition-all bg-surface-warm/50"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center text-accent font-bold text-sm">
                              {version.name}
                            </div>
                            <div>
                              <div className="font-medium text-fg-2">
                                {idx === 0 ? 'Latest Version' : `Version ${version.name}`}
                              </div>
                              <div className="text-xs text-muted">
                                {new Date(version.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>

                          {/* Fixed layout: Combined all buttons into one action container */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (selectedVersionIds.includes(version.id)) {
                                  setSelectedVersionIds(
                                    selectedVersionIds.filter((id) => id !== version.id)
                                  );
                                } else {
                                  setSelectedVersionIds([...selectedVersionIds, version.id]);
                                }
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${
                                selectedVersionIds.includes(version.id)
                                  ? 'bg-accent/15 text-accent'
                                  : 'text-meta hover:bg-surface-warm'
                              }`}
                              title={
                                selectedVersionIds.includes(version.id)
                                  ? 'Deselect for comparison'
                                  : 'Select for comparison'
                              }
                            >
                              <GitCompare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleLoadVersion(version)}
                              className="px-4 py-2 bg-bg border border-border hover:border-accent hover:text-accent rounded-lg text-sm font-medium transition-colors shadow-elev-ring"
                            >
                              Load Plan
                            </button>
                            <button
                              onClick={() => handleDeleteVersion(activeProjectId, version.id)}
                              className="p-2 text-meta hover:bg-danger/10 hover:text-danger border border-transparent hover:border-danger/30 rounded-lg transition-colors"
                              title="Delete Version"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>

                  {selectedVersionIds.length >= 2 && (
                    <div className="mt-4 p-3 bg-accent/10 border border-accent/20 rounded-lg">
                      <h4 className="text-xs font-bold text-accent mb-2">Version Comparison</h4>
                      <div className="space-y-2">
                        {projects
                          .find((p) => p.id === activeProjectId)
                          ?.versions.filter((v) => selectedVersionIds.includes(v.id))
                          .map((v, i) => (
                            <div key={v.id} className="text-xs text-fg-2">
                              <span className="font-medium">
                                {i === 0 ? 'Version A' : 'Version B'}:{' '}
                              </span>
                              {v.plan.rooms.length} rooms
                            </div>
                          ))}
                      </div>
                      {(() => {
                        const comparedVersions = projects
                          .find((p) => p.id === activeProjectId)
                          ?.versions.filter((v) => selectedVersionIds.includes(v.id));
                        if (comparedVersions && comparedVersions.length >= 2) {
                          const diff = compareVersions(comparedVersions[0], comparedVersions[1]);
                          return (
                            <div className="mt-2 pt-2 border-t border-accent/20 text-xs">
                              <p className="font-medium text-accent mb-1">Changes:</p>
                              <p className="text-muted">
                                {diff.rooms === 0
                                  ? 'No change in room count'
                                  : diff.rooms > 0
                                    ? `${diff.rooms} room(s) added`
                                    : `${Math.abs(diff.rooms)} room(s) removed`}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-meta">
                <Folder className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm">Select a project to view versions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
