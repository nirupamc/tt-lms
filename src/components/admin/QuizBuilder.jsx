import { useState, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, Trash2, GripVertical, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * QuizBuilder - Admin component for creating quiz questions
 * Used in CourseBuilderPage when module_type is 'quiz'
 * 
 * Props:
 *  - questions: Array of { id, prompt, options: string[], correct_index: number }
 *  - onChange: (questions) => void
 *  - passThreshold: number (0-100)
 *  - onPassThresholdChange: (threshold) => void
 */
export default function QuizBuilder({
  questions = [],
  onChange,
  passThreshold = 70,
  onPassThresholdChange,
}) {
  const [localQuestions, setLocalQuestions] = useState(() =>
    questions.length > 0
      ? questions
      : [createEmptyQuestion()]
  );

  function createEmptyQuestion() {
    return {
      id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      prompt: '',
      options: ['', ''],
      correct_index: 0,
    };
  }

  const updateQuestions = useCallback((newQuestions) => {
    setLocalQuestions(newQuestions);
    onChange?.(newQuestions);
  }, [onChange]);

  const addQuestion = () => {
    const newQuestions = [...localQuestions, createEmptyQuestion()];
    updateQuestions(newQuestions);
  };

  const removeQuestion = (index) => {
    if (localQuestions.length <= 1) return;
    const newQuestions = localQuestions.filter((_, i) => i !== index);
    updateQuestions(newQuestions);
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...localQuestions];
    newQuestions[index] = { ...newQuestions[index], [field]: value };
    updateQuestions(newQuestions);
  };

  const addOption = (questionIndex) => {
    if (localQuestions[questionIndex].options.length >= 6) return;
    const newQuestions = [...localQuestions];
    newQuestions[questionIndex].options = [
      ...newQuestions[questionIndex].options,
      '',
    ];
    updateQuestions(newQuestions);
  };

  const removeOption = (questionIndex, optionIndex) => {
    if (localQuestions[questionIndex].options.length <= 2) return;
    const newQuestions = [...localQuestions];
    const question = newQuestions[questionIndex];
    question.options = question.options.filter((_, i) => i !== optionIndex);
    // Adjust correct_index if needed
    if (question.correct_index >= question.options.length) {
      question.correct_index = question.options.length - 1;
    }
    updateQuestions(newQuestions);
  };

  const updateOption = (questionIndex, optionIndex, value) => {
    const newQuestions = [...localQuestions];
    newQuestions[questionIndex].options[optionIndex] = value;
    updateQuestions(newQuestions);
  };

  const setCorrectOption = (questionIndex, optionIndex) => {
    updateQuestion(questionIndex, 'correct_index', optionIndex);
  };

  const handleReorder = (reorderedQuestions) => {
    updateQuestions(reorderedQuestions);
  };

  const isValidQuestion = (question) => {
    return (
      question.prompt.trim() !== '' &&
      question.options.filter((o) => o.trim() !== '').length >= 2 &&
      question.correct_index >= 0 &&
      question.correct_index < question.options.length
    );
  };

  const validCount = localQuestions.filter(isValidQuestion).length;

  return (
    <div className="space-y-6">
      {/* Pass Threshold */}
      <div className="flex items-center gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
        <Label htmlFor="pass-threshold" className="text-sm font-medium">
          Pass Threshold
        </Label>
        <Input
          id="pass-threshold"
          type="number"
          min={0}
          max={100}
          value={passThreshold}
          onChange={(e) =>
            onPassThresholdChange?.(Math.min(100, Math.max(0, parseInt(e.target.value) || 70)))
          }
          className="w-20"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <span className="text-xs text-muted-foreground ml-auto">
          (Learners must score at least {passThreshold}% to pass)
        </span>
      </div>

      {/* Questions List (Reorderable) */}
      <Reorder.Group
        axis="y"
        values={localQuestions}
        onReorder={handleReorder}
        className="space-y-4"
      >
        <AnimatePresence initial={false}>
          {localQuestions.map((question, qIndex) => (
            <Reorder.Item
              key={question.id}
              value={question}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className={`border ${
                isValidQuestion(question)
                  ? 'border-green-200 dark:border-green-800'
                  : 'border-zinc-200 dark:border-zinc-800'
              }`}>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="cursor-grab active:cursor-grabbing">
                      <GripVertical className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-sm font-medium flex-1">
                      Question {qIndex + 1}
                    </CardTitle>
                    {isValidQuestion(question) ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeQuestion(qIndex)}
                      disabled={localQuestions.length <= 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Question Prompt */}
                  <div>
                    <Label className="text-xs">Question Prompt</Label>
                    <Input
                      value={question.prompt}
                      onChange={(e) =>
                        updateQuestion(qIndex, 'prompt', e.target.value)
                      }
                      placeholder="What is the main purpose of Git?"
                      className="mt-1"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-2">
                    <Label className="text-xs">
                      Options (click radio to mark correct answer)
                    </Label>
                    {question.options.map((option, oIndex) => (
                      <motion.div
                        key={oIndex}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="radio"
                          name={`correct-${question.id}`}
                          checked={question.correct_index === oIndex}
                          onChange={() => setCorrectOption(qIndex, oIndex)}
                          className="w-4 h-4 text-green-500"
                        />
                        <Input
                          value={option}
                          onChange={(e) =>
                            updateOption(qIndex, oIndex, e.target.value)
                          }
                          placeholder={`Option ${oIndex + 1}`}
                          className={`flex-1 ${
                            question.correct_index === oIndex
                              ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-950/30'
                              : ''
                          }`}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeOption(qIndex, oIndex)}
                          disabled={question.options.length <= 2}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </motion.div>
                    ))}

                    {question.options.length < 6 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => addOption(qIndex)}
                        className="mt-2"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Reorder.Item>
          ))}
        </AnimatePresence>
      </Reorder.Group>

      {/* Add Question Button */}
      <div className="flex items-center justify-between pt-4 border-t">
        <span className="text-sm text-muted-foreground">
          {validCount}/{localQuestions.length} questions valid
        </span>
        <Button onClick={addQuestion}>
          <Plus className="w-4 h-4 mr-2" />
          Add Question
        </Button>
      </div>
    </div>
  );
}
