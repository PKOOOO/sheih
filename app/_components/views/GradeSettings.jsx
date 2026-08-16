"use client";
import { useState } from "react";
import { Plus, RotateCcw, Save, Trash2, X } from "lucide-react";
import { DEFAULT_GRADES } from "../../_lib/schoolStructure";
import { DEFAULT_CBE_GRADES } from "../../_lib/grading";
import { uid } from "../../_lib/storage";
import PageHeader from "../PageHeader";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const LABEL_OPTIONS = [
  "Exceeds Expectation", "Meets Expectation",
  "Approaches Expectation", "Below Expectation",
];

// base-ui's <SelectValue> renders the raw *value* unless the root is given an
// `items` map — without it the trigger would read "#1a6e38|#d4edda".
const COLOR_OPTIONS = [
  { color: "#1a6e38", bg: "#d4edda", label: "Dark Green" },
  { color: "#1a6e38", bg: "#c3e6cb", label: "Green" },
  { color: "#0c5460", bg: "#bee5eb", label: "Dark Teal" },
  { color: "#0c5460", bg: "#d1ecf1", label: "Teal" },
  { color: "#856404", bg: "#fff3cd", label: "Dark Amber" },
  { color: "#856404", bg: "#ffeeba", label: "Amber" },
  { color: "#842029", bg: "#f8d7da", label: "Dark Red" },
  { color: "#6a0000", bg: "#f5c2c7", label: "Red" },
];

const COLOR_ITEMS = Object.fromEntries(
  COLOR_OPTIONS.map(o => [`${o.color}|${o.bg}`, o.label]),
);

// Grade scale settings view, extracted from App() in index.jsx.
export default function GradeSettings({
  t, cbeGrades, setCbeGrades, extraGrades, setExtraGrades,
  gradesForLevel, students, showToast, showConfirm,
}) {
  // Edited locally so a half-finished band can't leak into live reports; only
  // "Save Changes" commits.
  const [localGrades, setLocalGrades] = useState(cbeGrades.map(g => ({ ...g })));
  const [hasChanges, setHasChanges] = useState(false);
  const [newGradeName, setNewGradeName] = useState({ junior: "", senior: "" });

  const updateBand = (idx, patch) => {
    setLocalGrades(prev => prev.map((g, i) => i === idx ? { ...g, ...patch } : g));
    setHasChanges(true);
  };

  const saveGrades = () => {
    const sorted = [...localGrades].sort((a, b) => b.min - a.min);
    setCbeGrades(sorted);
    setLocalGrades(sorted);
    setHasChanges(false);
    showToast("Grade scale saved successfully.");
  };

  const resetToDefaults = () => {
    const defaults = DEFAULT_CBE_GRADES.map(g => ({ ...g }));
    setLocalGrades(defaults);
    setCbeGrades(defaults);
    setHasChanges(false);
    showToast("Grade scale reset to CBC defaults.");
  };

  const addBand = () => {
    setLocalGrades(prev => [...prev, {
      code: `NEW${uid().slice(0, 3).toUpperCase()}`,
      label: LABEL_OPTIONS[0], min: 0, max: 0,
      color: "#374151", bg: "#f3f4f6",
    }]);
    setHasChanges(true);
  };

  const removeBand = (idx) => {
    setLocalGrades(prev => prev.filter((_, i) => i !== idx));
    setHasChanges(true);
  };

  const addGradeLevel = (level) => {
    const name = newGradeName[level].trim();
    if (!name) return;
    if (gradesForLevel(level).includes(name)) {
      showToast(`"${name}" already exists in ${t.levels[level]}.`);
      return;
    }
    setExtraGrades(prev => ({ ...prev, [level]: [...(prev[level] || []), name] }));
    setNewGradeName(prev => ({ ...prev, [level]: "" }));
    showToast(`Added "${name}" to ${t.levels[level]}.`);
  };

  const removeExtraGrade = (level, name) => {
    const inUse = students.some(s => s.level === level && s.grade === name);
    if (inUse) {
      showToast(`Cannot remove "${name}" — students are enrolled in this grade.`);
      return;
    }
    showConfirm(`Remove "${name}" from ${t.levels[level]}?`, () => {
      setExtraGrades(prev => ({ ...prev, [level]: prev[level].filter(g => g !== name) }));
      showToast("Grade removed.");
    }, { danger: true });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title={t.nav.gradeSettings}
        description="Adjust the percentage ranges and labels for each CBC grading band. Changes apply system-wide to all results and reports."
      />

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-2.5">
          <CardTitle className="text-primary">Kenya CBC 8-Level Grading Bands</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={resetToDefaults}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset to Defaults
            </Button>
            <Button onClick={addBand}>
              <Plus className="size-4" aria-hidden="true" />
              Add Band
            </Button>
            {hasChanges && (
              <Button onClick={saveGrades} className="bg-gold text-gold-foreground hover:bg-gold/90">
                <Save className="size-4" aria-hidden="true" />
                Save Changes
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {hasChanges && (
            <Alert className="border-amber-300 bg-amber-50 text-amber-900">
              <AlertDescription className="text-amber-900">
                You have unsaved changes. Click <strong>Save Changes</strong> to apply them.
              </AlertDescription>
            </Alert>
          )}

          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  {["Code", "Label", "Min %", "Max %", "Preview", "Colour Scheme", ""]
                    .map((h, i) => <TableHead key={h || i}>{h}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {localGrades.map((g, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <Input
                        className="w-20" value={g.code} aria-label={`Band ${idx + 1} code`}
                        onChange={e => updateBand(idx, { code: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select value={g.label} onValueChange={v => updateBand(idx, { label: v })}>
                        <SelectTrigger className="w-[210px]" aria-label={`Band ${idx + 1} label`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LABEL_OPTIONS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} max={100} className="w-20" value={g.min}
                        aria-label={`Band ${idx + 1} minimum percent`}
                        onChange={e => updateBand(idx, { min: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number" min={0} max={100} className="w-20" value={g.max}
                        aria-label={`Band ${idx + 1} maximum percent`}
                        onChange={e => updateBand(idx, { max: Number(e.target.value) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className="whitespace-nowrap border-transparent font-bold"
                        style={{ color: g.color, backgroundColor: g.bg }}
                      >
                        {g.code} · {g.min}–{g.max}%
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        items={COLOR_ITEMS}
                        value={`${g.color}|${g.bg}`}
                        onValueChange={v => {
                          const [color, bg] = v.split("|");
                          updateBand(idx, { color, bg });
                        }}
                      >
                        <SelectTrigger className="w-[140px]" aria-label={`Band ${idx + 1} colour`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COLOR_OPTIONS.map(o => (
                            <SelectItem key={o.label} value={`${o.color}|${o.bg}`}>
                              <span className="flex items-center gap-2">
                                <span
                                  aria-hidden="true"
                                  className="size-3 rounded-full border"
                                  style={{ backgroundColor: o.bg, borderColor: o.color }}
                                />
                                {o.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      {localGrades.length > 1 && (
                        <Button
                          variant="ghost" size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeBand(idx)}
                          aria-label={`Remove band ${g.code}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-primary">Live Preview</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-8">
            {[...localGrades].sort((a, b) => b.min - a.min).map((g, i) => (
              <div
                key={`${g.code}-${i}`}
                className="rounded-lg border p-3"
                style={{ backgroundColor: g.bg, borderColor: `${g.color}33` }}
              >
                <p className="text-base font-extrabold" style={{ color: g.color }}>{g.code}</p>
                <p className="text-xs font-semibold" style={{ color: g.color }}>{g.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">{g.min}–{g.max}%</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {["junior", "senior"].map(level => (
          <Card key={level}>
            <CardHeader>
              <CardTitle className="text-primary">{t.levels[level]} — Grade Classes</CardTitle>
              <p className="text-xs text-muted-foreground">
                Default: {DEFAULT_GRADES[level].join(", ")}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {DEFAULT_GRADES[level].map(g => (
                  <Badge key={g} variant="secondary" className="bg-muted text-muted-foreground">{g}</Badge>
                ))}
                {(extraGrades[level] || []).map(g => (
                  <Badge key={g} variant="secondary" className="gap-1 bg-[#e8f0ed] pe-1 text-primary">
                    {g}
                    <button
                      type="button"
                      onClick={() => removeExtraGrade(level, g)}
                      className="rounded-full text-destructive hover:bg-destructive/10"
                      aria-label={`Remove ${g}`}
                    >
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>

              <div className="flex gap-2">
                <Label htmlFor={`add-grade-${level}`} className="sr-only">
                  Add a grade to {t.levels[level]}
                </Label>
                <Input
                  id={`add-grade-${level}`}
                  className="flex-1"
                  placeholder="e.g. Grade 13"
                  value={newGradeName[level]}
                  onChange={e => setNewGradeName(prev => ({ ...prev, [level]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addGradeLevel(level)}
                />
                <Button onClick={() => addGradeLevel(level)} disabled={!newGradeName[level].trim()}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
