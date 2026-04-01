import { useState, useCallback, Suspense, lazy } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RotateCcw, CheckCircle, XCircle, Loader2, Code2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';

// Lazy load Monaco Editor - NEVER eager import
const MonacoEditor = lazy(() => import('@monaco-editor/react'));

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript', monacoLang: 'javascript' },
  { value: 'python', label: 'Python', monacoLang: 'python' },
  { value: 'sql', label: 'SQL', monacoLang: 'sql' },
  { value: 'bash', label: 'Bash', monacoLang: 'shell' },
];

const EDITOR_OPTIONS = {
  minimap: { enabled: false },
  fontSize: 14,
  lineNumbers: 'on',
  roundedSelection: true,
  scrollBeyondLastLine: false,
  automaticLayout: true,
  tabSize: 2,
  wordWrap: 'on',
  padding: { top: 16, bottom: 16 },
};

// Editor loading fallback
function EditorSkeleton() {
  return (
    <div className="h-[300px] bg-zinc-900 rounded-lg flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-sm">Loading editor...</span>
      </div>
    </div>
  );
}

// Success flash animation
function EditorFlash({ show }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="absolute inset-0 bg-green-500/20 rounded-lg pointer-events-none z-10"
        />
      )}
    </AnimatePresence>
  );
}

export default function CodeChallenge({
  moduleId,
  userId,
  contentJson = {},
  onComplete,
}) {
  const {
    starter_code = '// Write your code here\n',
    expected_output = '',
    test_cases = [],
    hint = '',
    language: defaultLang = 'javascript',
    instructions = 'Complete the code challenge below.',
  } = contentJson;

  const [code, setCode] = useState(starter_code);
  const [language, setLanguage] = useState(defaultLang);
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState(null);
  const [showFlash, setShowFlash] = useState(false);
  const [attemptCount, setAttemptCount] = useState(0);

  const handleEditorChange = useCallback((value) => {
    setCode(value || '');
  }, []);

  const handleReset = useCallback(() => {
    setCode(starter_code);
    setResult(null);
  }, [starter_code]);

  const handleCheckAnswer = async () => {
    if (!code.trim()) {
      setResult({ passed: false, output: '', hint: 'Please write some code first.' });
      return;
    }

    setIsChecking(true);
    setResult(null);

    try {
      // Call Edge Function to check code
      const { data, error } = await supabase.functions.invoke('check-code', {
        body: {
          code,
          language,
          module_id: moduleId,
          user_id: userId,
          expected_output,
          test_cases,
        },
      });

      if (error) throw error;

      const checkResult = data || { passed: false, output: '', hint: 'Unknown error' };
      setResult(checkResult);
      setAttemptCount((prev) => prev + 1);

      // If passed, trigger success animation and callback
      if (checkResult.passed) {
        setShowFlash(true);
        setTimeout(() => setShowFlash(false), 600);
        
        // Notify parent component
        if (onComplete) {
          setTimeout(() => onComplete(), 800);
        }
      }
    } catch (err) {
      console.error('Code check error:', err);
      setResult({
        passed: false,
        output: '',
        hint: 'Failed to check code. Please try again.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const getLanguageConfig = (lang) => {
    return LANGUAGES.find((l) => l.value === lang) || LANGUAGES[0];
  };

  return (
    <Card className="border-zinc-800 bg-zinc-950">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code2 className="w-5 h-5 text-blue-500" />
            Code Challenge
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Attempts: {attemptCount}
            </Badge>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[130px] h-8 text-xs">
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
        </div>
        {instructions && (
          <p className="text-sm text-zinc-400 mt-2">{instructions}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Monaco Editor with lazy loading */}
        <div className="relative rounded-lg overflow-hidden border border-zinc-800">
          <EditorFlash show={showFlash} />
          <Suspense fallback={<EditorSkeleton />}>
            <MonacoEditor
              height="300px"
              language={getLanguageConfig(language).monacoLang}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={EDITOR_OPTIONS}
            />
          </Suspense>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleCheckAnswer}
            disabled={isChecking || !code.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isChecking ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Check Answer
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isChecking}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>

        {/* Result Display */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`p-4 rounded-lg border ${
                result.passed
                  ? 'bg-green-950/50 border-green-800'
                  : 'bg-red-950/50 border-red-800'
              }`}
            >
              <div className="flex items-start gap-3">
                {result.passed ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${result.passed ? 'text-green-400' : 'text-red-400'}`}>
                    {result.passed ? '🎉 Correct!' : 'Not quite right'}
                  </p>
                  {result.output && (
                    <pre className="mt-2 p-2 bg-black/50 rounded text-xs text-zinc-300 overflow-x-auto">
                      {result.output}
                    </pre>
                  )}
                  {result.hint && !result.passed && (
                    <p className="mt-2 text-sm text-zinc-400">
                      <span className="text-yellow-500">💡 Hint:</span> {result.hint}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show hint button if available and not yet revealed */}
        {hint && !result?.hint && attemptCount >= 2 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-yellow-500 hover:text-yellow-400"
            onClick={() => setResult((prev) => ({ ...prev, hint }))}
          >
            💡 Show Hint
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
