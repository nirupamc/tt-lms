// Supabase Edge Function: check-code
// Validates code submissions against expected output or test cases

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface TestCase {
  input: string;
  expected_output: string;
  description?: string;
}

interface CheckRequest {
  code: string;
  language: string;
  module_id: string;
  user_id: string;
  expected_output?: string;
  test_cases?: TestCase[];
}

interface CheckResult {
  passed: boolean;
  output: string;
  hint: string;
  test_results?: { passed: boolean; description: string }[];
}

// Normalize output for comparison (trim whitespace, normalize line endings)
function normalizeOutput(str: string): string {
  return str.replace(/\r\n/g, "\n").trim().toLowerCase();
}

// Simple string matching for expected output
function checkStringMatch(code: string, expectedOutput: string): CheckResult {
  const normalized = normalizeOutput(code);
  const expected = normalizeOutput(expectedOutput);

  // Check if code contains the expected output pattern
  const passed = normalized.includes(expected) || normalized === expected;

  return {
    passed,
    output: passed
      ? "Output matches expected result!"
      : "Output does not match expected result.",
    hint: passed ? "" : "Review your code logic and try again.",
  };
}

// Test case-based validation
function checkTestCases(code: string, testCases: TestCase[]): CheckResult {
  if (!testCases || testCases.length === 0) {
    return {
      passed: false,
      output: "No test cases defined.",
      hint: "Contact your administrator.",
    };
  }

  const testResults: { passed: boolean; description: string }[] = [];
  let allPassed = true;

  for (const testCase of testCases) {
    // For string matching, check if code contains expected patterns
    const codeNormalized = normalizeOutput(code);
    const expectedNormalized = normalizeOutput(testCase.expected_output);

    const passed = codeNormalized.includes(expectedNormalized);
    testResults.push({
      passed,
      description: testCase.description || `Test: ${testCase.input}`,
    });

    if (!passed) {
      allPassed = false;
    }
  }

  const passedCount = testResults.filter((t) => t.passed).length;
  const totalCount = testResults.length;

  return {
    passed: allPassed,
    output: `${passedCount}/${totalCount} tests passed`,
    hint: allPassed ? "" : "Some test cases failed. Check your implementation.",
    test_results: testResults,
  };
}

// Validate code syntax (basic checks per language)
function validateSyntax(
  code: string,
  language: string,
): { valid: boolean; error?: string } {
  const trimmed = code.trim();

  if (!trimmed) {
    return { valid: false, error: "Code cannot be empty." };
  }

  // Basic syntax checks per language
  switch (language) {
    case "javascript":
      // Check for common JS syntax issues
      if (trimmed.includes("function") && !trimmed.includes("{")) {
        return { valid: false, error: "Function declaration missing body." };
      }
      break;

    case "python":
      // Check for common Python syntax issues
      if (trimmed.includes("def ") && !trimmed.includes(":")) {
        return { valid: false, error: "Function definition missing colon." };
      }
      break;

    case "sql":
      // Check for common SQL issues
      const sqlKeywords = [
        "select",
        "insert",
        "update",
        "delete",
        "create",
        "alter",
        "drop",
      ];
      const hasSqlKeyword = sqlKeywords.some((kw) =>
        trimmed.toLowerCase().includes(kw),
      );
      if (!hasSqlKeyword) {
        return { valid: false, error: "No SQL statement detected." };
      }
      break;
  }

  return { valid: true };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Parse request body
    const body: CheckRequest = await req.json();
    const { code, language, module_id, user_id, expected_output, test_cases } =
      body;

    if (!code || !language || !module_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate syntax first
    const syntaxCheck = validateSyntax(code, language);
    if (!syntaxCheck.valid) {
      return new Response(
        JSON.stringify({
          passed: false,
          output: syntaxCheck.error,
          hint: "Check your code syntax.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Perform validation
    let result: CheckResult;

    if (test_cases && test_cases.length > 0) {
      // Use test case validation
      result = checkTestCases(code, test_cases);
    } else if (expected_output) {
      // Use simple string matching
      result = checkStringMatch(code, expected_output);
    } else {
      // No validation criteria - just pass if code is non-empty
      result = {
        passed: true,
        output: "Code submitted successfully.",
        hint: "",
      };
    }

    // Record attempt in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: insertError } = await supabase.from("code_attempts").insert({
      user_id,
      module_id,
      code,
      language,
      passed: result.passed,
      output: result.output,
      error_message: result.passed ? null : result.hint,
    });

    if (insertError) {
      console.error("Failed to record code attempt:", insertError);
      // Don't fail the request, just log the error
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Check code error:", error);
    return new Response(
      JSON.stringify({
        passed: false,
        output: "Server error",
        hint: "Please try again later.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
