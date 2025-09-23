"use client";
import { useState } from "react";

export default function App() {
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const validateEmails = async () => {
    setLoading(true);
    const res = await fetch("/api/validate-emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: emails.split(/\s|,/) }), // split by space or comma
    });
    const data = await res.json();
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto p-6 bg-white shadow rounded-xl">
      <h1 className="text-2xl font-bold mb-4">Email Validation Tool</h1>

      <textarea
        className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        rows={6}
        placeholder="Paste your emails separated by comma or space"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
      />

      <button
        onClick={validateEmails}
        disabled={loading}
        className="mt-4 w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "Checking..." : "Validate Emails"}
      </button>

      {results.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <h2 className="text-lg font-semibold mb-2">Results:</h2>
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-gray-100 text-left">
                <th className="border p-2">Email</th>
                <th className="border p-2">Syntax</th>
                <th className="border p-2">MX Record</th>
                <th className="border p-2">SMTP</th>
                <th className="border p-2">Final</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="text-sm">
                  <td className="border p-2">{r.email}</td>
                  <td className={`border p-2 ${r.syntaxValid ? "text-green-600" : "text-red-600"}`}>
                    {r.syntaxValid ? "✅" : "❌"}
                  </td>
                  <td className={`border p-2 ${r.mxValid ? "text-green-600" : "text-red-600"}`}>
                    {r.mxValid ? "✅" : "❌"}
                  </td>
                  <td className={`border p-2 ${r.smtpValid ? "text-green-600" : "text-red-600"}`}>
                    {r.smtpValid ? "✅" : "❌"}
                  </td>
                  <td
                    className={`border p-2 font-bold ${
                      r.valid ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {r.valid ? "Valid" : "Invalid"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}