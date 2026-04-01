/**
 * Environment variable validation utility
 * Validates required environment variables on app startup
 */

const requiredEnvVars = {
  // Supabase configuration
  VITE_SUPABASE_URL: {
    description: 'Supabase project URL',
    example: 'https://your-project.supabase.co',
    required: true,
  },
  VITE_SUPABASE_ANON_KEY: {
    description: 'Supabase anonymous public key',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  },
  VITE_SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key (for Edge Functions)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: false, // Only needed for admin functions
  },
  VITE_FILE_SERVER_URL: {
    description: 'File server URL for video streaming',
    example: 'http://localhost:3001',
    required: false, // Only needed if using video features
  },
};

// Edge Function environment variables (server-side only)
export const edgeFunctionEnvVars = {
  SUPABASE_URL: {
    description: 'Supabase project URL (server-side)',
    required: true,
  },
  SUPABASE_SERVICE_ROLE_KEY: {
    description: 'Supabase service role key',
    required: true,
  },
  RESEND_API_KEY: {
    description: 'Resend email service API key',
    example: 're_xxxxxxxxxxxxx',
    required: true,
  },
  SUPABASE_JWT_SECRET: {
    description: 'JWT secret for token verification',
    required: true,
  },
};

class EnvironmentValidationError extends Error {
  constructor(message, missingVars = []) {
    super(message);
    this.name = 'EnvironmentValidationError';
    this.missingVars = missingVars;
  }
}

/**
 * Validates all required environment variables
 * @param {boolean} strict - If true, throws error on missing required vars
 * @returns {object} Validation result with missing vars and warnings
 */
export function validateEnvironment(strict = true) {
  const missing = [];
  const warnings = [];
  const present = [];

  // Check each required environment variable
  Object.entries(requiredEnvVars).forEach(([key, config]) => {
    const value = import.meta.env[key];
    
    if (!value || value.trim() === '') {
      if (config.required) {
        missing.push({
          key,
          description: config.description,
          example: config.example,
        });
      } else {
        warnings.push({
          key,
          description: config.description,
          message: 'Optional feature may not work without this variable',
        });
      }
    } else {
      present.push({
        key,
        description: config.description,
        value: key.includes('KEY') || key.includes('SECRET') 
          ? `${value.substring(0, 10)}...` // Mask sensitive values
          : value,
      });
    }
  });

  // Validation result
  const result = {
    valid: missing.length === 0,
    missing,
    warnings,
    present,
    environment: import.meta.env.MODE || 'development',
  };

  // In strict mode, throw error if required vars are missing
  if (strict && missing.length > 0) {
    const missingKeys = missing.map(item => item.key);
    const errorMessage = `
🚨 Missing Required Environment Variables

The following environment variables are required but not found:

${missing.map(item => 
  `  ❌ ${item.key}
     Description: ${item.description}
     ${item.example ? `Example: ${item.example}` : ''}`
).join('\n\n')}

To fix this:
1. Create a .env file in your project root
2. Add the missing variables with appropriate values
3. Restart your development server

Example .env file:
${missing.map(item => `${item.key}=${item.example || 'your-value-here'}`).join('\n')}

For more information, see the project README.md
    `.trim();

    throw new EnvironmentValidationError(errorMessage, missingKeys);
  }

  return result;
}

/**
 * Logs environment validation results to console
 * @param {object} validationResult - Result from validateEnvironment()
 */
export function logEnvironmentStatus(validationResult) {
  const { valid, missing, warnings, present, environment } = validationResult;

  // Only log in development if you want less noise
  if (environment === 'development' && import.meta.env.VITE_SHOW_ENV_LOGS === 'true') {
    console.group(`🔧 Environment Validation (${environment.toUpperCase()})`);
  }

  // Log present variables
  if (present.length > 0) {
    console.group('✅ Present Variables:');
    present.forEach(item => {
      console.log(`  ${item.key}: ${item.value}`);
    });
    console.groupEnd();
  }

  // Log warnings for optional variables
  if (warnings.length > 0) {
    console.group('⚠️ Optional Variables (missing):');
    warnings.forEach(item => {
      console.warn(`  ${item.key}: ${item.message}`);
    });
    console.groupEnd();
  }

  // Log missing required variables
  if (missing.length > 0) {
    console.group('❌ Missing Required Variables:');
    missing.forEach(item => {
      console.error(`  ${item.key}: ${item.description}`);
    });
    console.groupEnd();
  }

  // Summary
  if (valid) {
    console.log('🎉 All required environment variables are present!');
  } else {
    console.error(`💥 ${missing.length} required environment variables missing`);
  }

  console.groupEnd();
}

/**
 * Creates a helpful setup guide for missing environment variables
 * @param {object} validationResult - Result from validateEnvironment()
 * @returns {string} HTML setup guide
 */
export function createSetupGuide(validationResult) {
  const { missing } = validationResult;

  if (missing.length === 0) {
    return null;
  }

  return `
    <div style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 2rem;
      font-family: monospace;
      z-index: 9999;
      overflow-y: auto;
    ">
      <div style="max-width: 800px; margin: 0 auto;">
        <h1 style="color: #ef4444; margin-bottom: 2rem;">⚡ Environment Setup Required</h1>
        
        <p style="margin-bottom: 2rem; color: #94a3b8;">
          Your app is missing required environment variables. Follow these steps to get started:
        </p>

        <h2 style="color: #3b82f6; margin-bottom: 1rem;">1. Create .env file</h2>
        <p style="margin-bottom: 1rem; color: #94a3b8;">
          Create a <code>.env</code> file in your project root with:
        </p>
        
        <div style="
          background: #1e293b;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 2rem;
          overflow-x: auto;
        ">
          <pre style="margin: 0; color: #e2e8f0;">${missing.map(item => 
            `${item.key}=${item.example || 'your-value-here'}`
          ).join('\n')}</pre>
        </div>

        <h2 style="color: #3b82f6; margin-bottom: 1rem;">2. Get your values</h2>
        <ul style="margin-bottom: 2rem; color: #94a3b8;">
          ${missing.map(item => `
            <li style="margin-bottom: 0.5rem;">
              <strong style="color: #f1f5f9;">${item.key}:</strong> ${item.description}
            </li>
          `).join('')}
        </ul>

        <h2 style="color: #3b82f6; margin-bottom: 1rem;">3. Restart your server</h2>
        <p style="color: #94a3b8;">
          After creating the .env file, restart your development server with <code>npm run dev</code>
        </p>

        <button onclick="window.location.reload()" style="
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          margin-top: 2rem;
        ">
          🔄 Reload Page
        </button>
      </div>
    </div>
  `;
}

// Auto-validate environment on import (non-strict in production)
export let validationResult;

try {
  validationResult = validateEnvironment(import.meta.env.MODE === 'development');
  
  // Log validation results in development
  if (import.meta.env.MODE === 'development') {
    logEnvironmentStatus(validationResult);
  }

  // Show setup guide if missing required vars and not in strict mode
  if (!validationResult.valid && import.meta.env.MODE !== 'development') {
    const setupGuide = createSetupGuide(validationResult);
    if (setupGuide) {
      // Create and inject setup guide into DOM
      const setupDiv = document.createElement('div');
      setupDiv.innerHTML = setupGuide;
      document.body.appendChild(setupDiv);
    }
  }
} catch (error) {
  if (error instanceof EnvironmentValidationError) {
    // In development, show helpful error page
    if (import.meta.env.MODE === 'development') {
      console.error(error.message);
      const setupGuide = createSetupGuide({ missing: error.missingVars.map(key => ({
        key,
        description: requiredEnvVars[key]?.description || 'Required environment variable',
        example: requiredEnvVars[key]?.example,
      }))});
      
      if (setupGuide) {
        document.body.innerHTML = setupGuide;
      }
    } else {
      // In production, just log error and continue
      console.error('Environment validation failed:', error.message);
    }
  } else {
    // Re-throw other errors
    throw error;
  }
}

export { EnvironmentValidationError };