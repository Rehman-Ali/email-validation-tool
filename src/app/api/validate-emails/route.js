import { NextResponse } from "next/server";
import validator from "email-validator";
import dns from "dns/promises";
import verifier from "email-verify";

// 1. Syntax check
function checkSyntax(email) {
  return validator.validate(email);
}

// 2. MX record check
async function checkMxRecord(email){
  try {
    const domain = email.split("@")[1];
    if (!domain) return false;

    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

// 3. SMTP check
function checkSMTP(email) {
  return new Promise((resolve) => {
    verifier.verify(email, { timeout: 5000 }, (err, info) => {
      if (err) {
        console.error("SMTP check error:", err);
        resolve(false);
      } else {
        resolve(info.success);
      }
    });
  });
}

export async function POST(req) {
  const { emails } = await req.json();

  if (!Array.isArray(emails)) {
    return NextResponse.json({ error: "Emails must be an array" }, { status: 400 });
  }

  const results = await Promise.all(
    emails
      .filter((e) => e.trim() !== "")
      .map(async (email) => {
        const syntaxValid = checkSyntax(email);

        let mxValid = false;
        let smtpValid = false;

        if (syntaxValid) {
          mxValid = await checkMxRecord(email);
          if (mxValid) {
            smtpValid = await checkSMTP(email);
          }
        }

        return {
          email,
          syntaxValid,
          mxValid,
          smtpValid,
          valid: syntaxValid && mxValid && smtpValid,
        };
      })
  );

  return NextResponse.json(results);
}
