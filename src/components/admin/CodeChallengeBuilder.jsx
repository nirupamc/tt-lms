import { useState, Suspense, lazy } from "react";
import { Code2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

// Lazy load Monaco Editor
const MonacoEditor = lazy(() => import("@monaco-editor/react"));

const LANGUAGES = [
  { value: "javascript", label: "JavaScript" },
  { value: "python", label: "Python" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
];

function EditorSkeleton() {
  return (
    <div className="h-[200px] bg-zinc-900 rounded-lg flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
    </div>
  );
}

/**
 * CodeChallengeBuilder - Admin component for creating code challenge blocks
 *
 * Props:
 *  - contentJson: { language, starter_code, expected_output, hint, instructions }
 *  - onChange: (contentJson) => void
 */
export default function CodeChallengeBuilder({ contentJson = {}, onChange }) {
  const [data, setData] = useState({
    language: contentJson.language || "javascript",
    starter_code: contentJson.starter_code || "// Write your code here\n",
    expected_output: contentJson.expected_output || "",
    hint: contentJson.hint || "",
    instructions: contentJson.instructions || "",
    test_cases: contentJson.test_cases || [],
  });

  const updateField = (field, value) => {
    const newData = { ...data, [field]: value };
    setData(newData);
    onChange?.(newData);
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardContent className="space-y-4 pt-4">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Code2 className="w-5 h-5" />
          <span className="font-medium">Code Challenge Configuration</span>
        </div>

        {/* Language & Instructions */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Language</Label>
            <Select
              value={data.language}
              onValueChange={(v) => updateField("language", v)}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Instructions</Label>
            <Input
              value={data.instructions}
              onChange={(e) => updateField("instructions", e.target.value)}
              placeholder="Write a function that..."
              className="mt-1"
            />
          </div>
        </div>

        {/* Starter Code */}
        <div>
          <Label className="text-xs">Starter Code (shown to learner)</Label>
          <div className="mt-1 rounded-lg overflow-hidden border border-zinc-700">
            <Suspense fallback={<EditorSkeleton />}>
              <MonacoEditor
                height="200px"
                language={data.language === "bash" ? "shell" : data.language}
                value={data.starter_code}
                onChange={(v) => updateField("starter_code", v || "")}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  lineNumbers: "on",
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: 2,
                }}
              />
            </Suspense>
          </div>
        </div>

        {/* Expected Output */}
        <div>
          <Label className="text-xs">Expected Output (for validation)</Label>
          <Textarea
            value={data.expected_output}
            onChange={(e) => updateField("expected_output", e.target.value)}
            placeholder="The output pattern to match (e.g., 'Hello World' or a specific return value)"
            rows={3}
            className="mt-1 font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1">
            The learner's code will be checked against this pattern
          </p>
        </div>

        {/* Hint */}
        <div>
          <Label className="text-xs">
            Hint (shown after 2 failed attempts)
          </Label>
          <Textarea
            value={data.hint}
            onChange={(e) => updateField("hint", e.target.value)}
            placeholder="Try using a for loop to iterate..."
            rows={2}
            className="mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
