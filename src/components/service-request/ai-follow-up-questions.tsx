"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { HelpCircle, ArrowRight, Loader2 } from "lucide-react";
import type { IntakeFollowupOutput } from "@/lib/ai/types";

interface AIFollowUpQuestionsProps {
  questions: IntakeFollowupOutput["questions"];
  initialAnswers?: Record<string, string>;
  onSubmit: (answers: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export function AIFollowUpQuestions({
  questions,
  initialAnswers = {},
  onSubmit,
  isSubmitting = false,
}: AIFollowUpQuestionsProps) {
  const [answers, setAnswers] = useState<Record<string, string>>(initialAnswers);

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(answers);
  };

  const isFormValid = questions
    .filter((q) => q.required)
    .every((q) => answers[q.id] && answers[q.id].trim() !== "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-primary" />
          A Few Quick Questions
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help us understand your issue better so we can match you with the right provider.
        </p>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="space-y-2">
              <Label htmlFor={question.id} className="flex items-center gap-1">
                {question.question}
                {question.required && <span className="text-red-500">*</span>}
              </Label>

              {question.type === "text" && (
                <Input
                  id={question.id}
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  placeholder="Enter your answer..."
                  required={question.required}
                />
              )}

              {question.type === "select" && question.options && (
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options.map((option) => (
                    <div key={option} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                      <Label
                        htmlFor={`${question.id}-${option}`}
                        className="font-normal cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {question.type === "boolean" && (
                <div className="flex items-center space-x-3">
                  <Switch
                    id={question.id}
                    checked={answers[question.id] === "yes"}
                    onCheckedChange={(checked) =>
                      handleAnswerChange(question.id, checked ? "yes" : "no")
                    }
                  />
                  <Label htmlFor={question.id} className="font-normal cursor-pointer">
                    {answers[question.id] === "yes" ? "Yes" : "No"}
                  </Label>
                </div>
              )}
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
