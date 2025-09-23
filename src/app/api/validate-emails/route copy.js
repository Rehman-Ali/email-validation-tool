import { NextResponse } from "next/server";
import validator from "email-validator";
import dns from "dns/promises";
import verifier from "email-verify";

// Keep only reliable libraries
import levenshtein from "fast-levenshtein";
import punycode from "punycode";

// Enhanced regex patterns
const PATTERNS = {
  EMAIL_COMPREHENSIVE: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  SUSPICIOUS_PATTERNS: [
    /^test.*@/i,
    /^temp.*@/i,
    /^no.*reply@/i,
    /^\d+@/,
    /^.{1,2}@/,
  ]
};

// Disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', 'guerrillamail.com', 'mailinator.com', 
  'tempmail.org', 'yopmail.com', 'throwaway.email', 'temp-mail.org',
  'mohmal.com', 'sharklasers.com', 'getairmail.com', 'maildrop.cc',
  '33mail.com', 'spamgourmet.com', 'temporaryemail.net'
]);

// Popular email providers - FIXED
const POPULAR_PROVIDERS = new Set([
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
  'icloud.com', 'protonmail.com', 'aol.com', 'live.com',
  'msn.com', 'ymail.com', 'rocketmail.com'
]);

// Domain corrections
const DOMAIN_CORRECTIONS = {
  'gmial.com': 'gmail.com', 'gmai.com': 'gmail.com', 'gmail.co': 'gmail.com',
  'gmali.com': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmeil.com': 'gmail.com',
  'yahooo.com': 'yahoo.com', 'yahoo.co': 'yahoo.com', 'yaho.com': 'yahoo.com',
  'yahho.com': 'yahoo.com', 'ymail.co': 'ymail.com',
  'hotmial.com': 'hotmail.com', 'hotmai.com': 'hotmail.com', 'hotmil.com': 'hotmail.com',
  'outlok.com': 'outlook.com', 'outloo.com': 'outlook.com', 'outlokc.com': 'outlook.com',
  'live.co': 'live.com', 'msn.co': 'msn.com', 'iclou.com': 'icloud.com'
};

// 1. Enhanced but reliable syntax validation
function enhancedSyntaxCheck(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, reason: 'Invalid input type' };
  }
  
  const trimmedEmail = email.trim();
  
  // Length validation
  if (trimmedEmail.length < 3 || trimmedEmail.length > 320) {
    return { valid: false, reason: 'Invalid length' };
  }
  
  // Multiple @ check
  const atCount = (trimmedEmail.match(/@/g) || []).length;
  if (atCount !== 1) {
    return { valid: false, reason: 'Invalid @ symbol count' };
  }
  
  // Use multiple validators - be more forgiving
  const emailValidatorResult = validator.validate(trimmedEmail);
  const regexResult = PATTERNS.EMAIL_COMPREHENSIVE.test(trimmedEmail);
  
  // Check for suspicious patterns
  const suspiciousScore = PATTERNS.SUSPICIOUS_PATTERNS.reduce((score, pattern) => {
    return score + (pattern.test(trimmedEmail) ? 1 : 0);
  }, 0);
  
  // More lenient - if either validator passes, consider it valid
  const isValid = emailValidatorResult || regexResult;
  
  return {
    valid: isValid,
    validations: {
      emailValidator: emailValidatorResult,
      regexTest: regexResult
    },
    suspiciousScore,
    reason: isValid ? 'Valid syntax' : 'Syntax validation failed'
  };
}

// 2. Improved domain validation
function advancedDomainValidation(email) {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return { valid: false, suggestion: null };

  // Convert IDN domains to ASCII
  let asciiDomain;
  try {
    asciiDomain = punycode.toASCII(domain);
  } catch {
    asciiDomain = domain;
  }

  // Check for direct typo correction
  if (DOMAIN_CORRECTIONS[domain]) {
    return {
      valid: false,
      suggestion: email.replace(domain, DOMAIN_CORRECTIONS[domain]),
      typo: true,
      confidence: 'high'
    };
  }

  // Fuzzy matching for popular domains
  let bestMatch = null;
  let bestDistance = Infinity;

  Array.from(POPULAR_PROVIDERS).forEach(popularDomain => {
    const distance = levenshtein.get(domain, popularDomain);
    const similarity = 1 - (distance / Math.max(domain.length, popularDomain.length));
    
    if (distance <= 2 && similarity > 0.7 && distance < bestDistance) {
      bestDistance = distance;
      bestMatch = popularDomain;
    }
  });

  // Check disposable email
  const isDisposable = DISPOSABLE_DOMAINS.has(domain);

  if (bestMatch && bestDistance <= 2) {
    return {
      valid: false,
      suggestion: email.replace(domain, bestMatch),
      typo: true,
      confidence: 'high',
      distance: bestDistance
    };
  }

  return {
    valid: true,
    isDisposable,
    isPopularProvider: POPULAR_PROVIDERS.has(domain),
    suggestion: null
  };
}

// 3. More reliable MX validation with better error handling
const mxCache = new Map();
const MX_CACHE_TTL = 300000; // 5 minutes

async function enhancedMxCheck(email) {
  const domain = email.split("@")[1];
  if (!domain) return { valid: false, details: "No domain found" };

  const cacheKey = domain.toLowerCase();
  const cached = mxCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < MX_CACHE_TTL) {
    return { ...cached.result, cached: true };
  }

  try {
    const result = await performMxCheck(domain);
    
    mxCache.set(cacheKey, {
      result,
      timestamp: Date.now()
    });
    
    return result;
  } catch (error) {
    // For popular providers, be more forgiving
    if (POPULAR_PROVIDERS.has(domain.toLowerCase())) {
      return {
        valid: true,
        details: `DNS check failed for popular provider ${domain}, assuming valid`,
        fallback: true,
        error: error.message
      };
    }
    
    return { valid: false, details: `DNS error: ${error.message}` };
  }
}

async function performMxCheck(domain) {
  const checks = {};

  try {
    // Try MX records first
    const mxRecords = await dns.resolveMx(domain);
    if (mxRecords && mxRecords.length > 0) {
      const sortedMx = mxRecords.sort((a, b) => a.priority - b.priority);
      return {
        valid: true,
        type: 'MX',
        details: `Found ${mxRecords.length} MX record(s)`,
        records: sortedMx.map(r => ({ exchange: r.exchange, priority: r.priority })),
        primaryMx: sortedMx[0].exchange
      };
    }
  } catch (mxError) {
    checks.mxError = mxError.message;
  }

  // Fallback to A records
  try {
    const aRecords = await dns.resolve4(domain);
    if (aRecords && aRecords.length > 0) {
      return {
        valid: true,
        type: 'A',
        details: "No MX records, using A records (fallback)",
        records: aRecords,
        fallback: true
      };
    }
  } catch (aError) {
    checks.aError = aError.message;
  }

  return {
    valid: false,
    details: "No mail-capable DNS records found",
    attempts: checks
  };
}

// 4. More reliable SMTP validation with better timeout handling
async function reliableSmtpCheck(email, timeout = 8000) {
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => {
      resolve({
        valid: null, // null means inconclusive, not failed
        details: "SMTP check timeout - inconclusive",
        timeout: true
      });
    }, timeout);

    try {
      verifier.verify(email, { 
        timeout: timeout - 1000,
        port: 25
      }, (err, info) => {
        clearTimeout(timeoutId);
        
        if (err) {
          // Don't fail completely on SMTP errors for popular providers
          const domain = email.split('@')[1]?.toLowerCase();
          if (POPULAR_PROVIDERS.has(domain)) {
            resolve({
              valid: null, // Inconclusive for popular providers
              details: `SMTP check failed for popular provider: ${err.message}`,
              error: err.message,
              popularProvider: true
            });
          } else {
            resolve({
              valid: false,
              details: `SMTP check failed: ${err.message}`,
              error: err.message
            });
          }
        } else {
          resolve({
            valid: info.success,
            details: info.success ? "SMTP verification passed" : "SMTP verification failed",
            info: info
          });
        }
      });
    } catch (error) {
      clearTimeout(timeoutId);
      resolve({
        valid: null,
        details: `SMTP check error: ${error.message}`,
        error: error.message
      });
    }
  });
}

// 5. Simple rate limiting
const rateLimitMap = new Map();

function checkRateLimit(ip, maxRequests = 100, windowMs = 60000) {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  
  const requests = rateLimitMap.get(ip);
  
  // Remove old requests
  while (requests.length > 0 && requests[0] < windowStart) {
    requests.shift();
  }
  
  if (requests.length >= maxRequests) {
    return {
      allowed: false,
      limit: maxRequests,
      remaining: 0,
      resetTime: windowStart + windowMs
    };
  }
  
  requests.push(now);
  return {
    allowed: true,
    limit: maxRequests,
    remaining: maxRequests - requests.length,
    resetTime: windowStart + windowMs
  };
}

export async function POST(req) {
  try {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
    
    // Rate limiting
    const rateLimitResult = checkRateLimit(ip);
    if (!rateLimitResult.allowed) {
      return NextResponse.json({
        error: "Rate limit exceeded",
        limit: rateLimitResult.limit,
        resetTime: new Date(rateLimitResult.resetTime).toISOString()
      }, { status: 429 });
    }

    const body = await req.json();
    const { emails, options = {} } = body;

    if (!Array.isArray(emails)) {
      return NextResponse.json({ error: "Emails must be an array" }, { status: 400 });
    }

    if (emails.length > 100) {
      return NextResponse.json({ error: "Maximum 100 emails allowed per request" }, { status: 400 });
    }

    // Options with better defaults
    const {
      skipSMTP = false,
      checkDisposable = true,
      strictValidation = false,
      timeout = 8000,
      includeSuggestions = true
    } = options;

    const startTime = Date.now();

    // Process emails with improved logic
    const results = await Promise.allSettled(
      emails
        .filter((e) => e && typeof e === 'string' && e.trim() !== "")
        .slice(0, 100)
        .map(async (email, index) => {
          const originalEmail = email.trim();
          const normalizedEmail = originalEmail.toLowerCase();
          
          const result = {
            email: originalEmail,
            normalizedEmail,
            index,
            syntaxValid: false,
            domainValid: false,
            mxValid: false,
            smtpValid: null,
            valid: false,
            confidence: 0,
            details: {},
            suggestions: [],
            flags: [],
            metadata: {}
          };

          try {
            // Step 1: Syntax validation
            const syntaxCheck = enhancedSyntaxCheck(normalizedEmail);
            result.syntaxValid = syntaxCheck.valid;
            result.details.syntax = syntaxCheck;
            
            if (!syntaxCheck.valid) {
              result.details.failureReason = 'Invalid syntax';
              return result;
            }

            // Add suspicious flag if needed
            if (syntaxCheck.suspiciousScore > 0) {
              result.flags.push(`suspicious_pattern_score_${syntaxCheck.suspiciousScore}`);
            }

            // Step 2: Domain validation
            const domainCheck = advancedDomainValidation(normalizedEmail);
            result.domainValid = domainCheck.valid;
            result.details.domain = domainCheck;

            if (domainCheck.typo && includeSuggestions) {
              result.suggestions.push({
                type: 'typo_correction',
                suggestion: domainCheck.suggestion,
                confidence: domainCheck.confidence
              });
            }

            if (domainCheck.isDisposable && checkDisposable) {
              result.flags.push('disposable_email');
            }

            if (!domainCheck.valid && !domainCheck.typo) {
              result.details.failureReason = 'Invalid domain';
              return result;
            }

            // Step 3: MX validation (more lenient)
            if (domainCheck.valid) {
              const mxCheck = await enhancedMxCheck(normalizedEmail);
              result.mxValid = mxCheck.valid;
              result.details.mx = mxCheck;

              if (!mxCheck.valid) {
                result.details.failureReason = 'No mail servers found';
              }
            }

            // Step 4: SMTP validation (optional and more forgiving)
            if (result.mxValid && !skipSMTP) {
              const smtpCheck = await reliableSmtpCheck(normalizedEmail, timeout);
              result.smtpValid = smtpCheck.valid;
              result.details.smtp = smtpCheck;
            } else if (skipSMTP) {
              result.smtpValid = null;
              result.details.smtp = { skipped: true };
            }

            // IMPROVED: More lenient validation calculation
            let validityScore = 0;
            if (result.syntaxValid) validityScore += 30; // Syntax is most important
            if (result.domainValid) validityScore += 30; // Domain validity is crucial
            if (result.mxValid) validityScore += 25;     // MX records important
            
            // SMTP handling - be more forgiving
            if (result.smtpValid === true) {
              validityScore += 15; // SMTP success
            } else if (result.smtpValid === null) {
              // SMTP inconclusive - don't penalize much
              validityScore += 10; 
            }
            // Only penalize if SMTP explicitly fails (result.smtpValid === false)

            result.confidence = validityScore;
            
            // More lenient overall validation
            if (strictValidation) {
              result.valid = validityScore >= 90; // Strict mode
            } else {
              // Normal mode - be more forgiving
              result.valid = validityScore >= 70; // Lowered from 75
              
              // Special case for popular providers with good syntax/domain/mx
              const domain = normalizedEmail.split('@')[1];
              if (POPULAR_PROVIDERS.has(domain) && result.syntaxValid && result.domainValid && result.mxValid) {
                result.valid = true;
                result.flags.push('popular_provider_accepted');
              }
            }

            // Add metadata
            result.metadata = {
              processingTimeMs: Date.now() - startTime,
              validationMethod: skipSMTP ? 'syntax_domain_mx' : 'full_validation',
              strictMode: strictValidation
            };

            return result;

          } catch (error) {
            result.details.error = `Processing error: ${error.message}`;
            result.details.failureReason = 'Processing exception';
            return result;
          }
        })
    );

    // Process results
    const processedResults = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          email: emails[index],
          valid: false,
          error: `Processing failed: ${result.reason?.message || 'Unknown error'}`,
          details: { failureReason: 'Promise rejection' }
        };
      }
    });

    const summary = {
      total: processedResults.length,
      valid: processedResults.filter(r => r.valid).length,
      invalid: processedResults.filter(r => !r.valid).length,
      withSuggestions: processedResults.filter(r => r.suggestions?.length > 0).length,
      disposable: processedResults.filter(r => r.flags?.includes('disposable_email')).length,
      suspicious: processedResults.filter(r => r.flags?.some(f => f.startsWith('suspicious'))).length,
      averageConfidence: Math.round(
        processedResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / processedResults.length
      ),
      processingTimeMs: Date.now() - startTime
    };

    return NextResponse.json({
      results: processedResults,
      summary,
      metadata: {
        apiVersion: '2.1',
        validationMethod: skipSMTP ? 'standard' : 'comprehensive',
        rateLimitRemaining: rateLimitResult.remaining,
        options: {
          skipSMTP,
          checkDisposable,
          strictValidation,
          timeout,
          includeSuggestions
        }
      }
    }, {
      headers: {
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
        'X-Processing-Time': (Date.now() - startTime).toString()
      }
    });

  } catch (error) {
    console.error("Email validation error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error during email validation",
        details: error.message 
      }, 
      { status: 500 }
    );
  }
}