"use client";
import { useState } from "react";

export default function App() {
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [options, setOptions] = useState({
    skipSMTP: false,
    checkDisposable: true,
    strictValidation: false,
    timeout: 12000
  });

  const validateEmails = async () => {
    if (!emails.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/validate-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          emails: emails.split(/[\s,\n]+/).filter(e => e.trim()),
          options 
        }),
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }
      
      const data = await res.json();
      setResults(data);
    } catch (error) {
      console.error("Validation error:", error);
      setResults({
        results: [],
        summary: { total: 0, valid: 0, invalid: 0 },
        error: error.message
      });
    }
    setLoading(false);
  };

  const getStatusColor = (valid, confidence = 0) => {
    if (valid) return "text-green-600";
    if (confidence > 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceBadge = (confidence = 0) => {
    const color = confidence >= 80 ? "bg-green-100 text-green-800" :
                  confidence >= 60 ? "bg-yellow-100 text-yellow-800" :
                  confidence >= 40 ? "bg-orange-100 text-orange-800" :
                  "bg-red-100 text-red-800";
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {confidence}%
      </span>
    );
  };

  const renderDetailModal = (result) => {
    if (!selectedEmail) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-auto">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">Detailed Analysis</h3>
              <button 
                onClick={() => setSelectedEmail(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-lg font-mono mt-2 break-all">{result.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`font-medium ${result.valid ? 'text-green-700' : 'text-red-700'}`}>
                {result.valid ? '✅ Valid' : '❌ Invalid'}
              </span>
              {getConfidenceBadge(result.confidence)}
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Validation Steps */}
            <div>
              <h4 className="font-semibold mb-3">Validation Steps</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border ${result.syntaxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.syntaxValid ? '✅' : '❌'}</span>
                    <span className="font-medium">Syntax</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Email format check</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.domainValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.domainValid ? '✅' : '❌'}</span>
                    <span className="font-medium">Domain</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Domain validity</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.mxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.mxValid ? '✅' : '❌'}</span>
                    <span className="font-medium">MX Records</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Mail server check</p>
                </div>

                <div className={`p-3 rounded-lg border ${
                  result.smtpValid === null ? 'bg-gray-50 border-gray-200' :
                  result.smtpValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <span>
                      {result.smtpValid === null ? '⏸️' : result.smtpValid ? '✅' : '❌'}
                    </span>
                    <span className="font-medium">SMTP</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.smtpValid === null ? 'Skipped' : 'Delivery check'}
                  </p>
                </div>
              </div>
            </div>

            {/* Suggestions */}
            {result.suggestions && result.suggestions.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">💡 Suggestions</h4>
                <div className="space-y-2">
                  {result.suggestions.map((suggestion, idx) => (
                    <div key={idx} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="font-medium text-yellow-800">Possible Typo Detected</p>
                      <p className="text-yellow-700">
                        Did you mean: <span className="font-mono bg-yellow-100 px-1 rounded">{suggestion.suggestion}</span>
                      </p>
                      {suggestion.confidence && (
                        <p className="text-sm text-yellow-600">Confidence: {suggestion.confidence}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Flags */}
            {result.flags && result.flags.length > 0 && (
              <div>
                <h4 className="font-semibold mb-3">⚠️ Flags</h4>
                <div className="flex flex-wrap gap-2">
                  {result.flags.map((flag, idx) => (
                    <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
                      {flag.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Technical Details */}
            {result.details && (
              <div>
                <h4 className="font-semibold mb-3">🔧 Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MX Records */}
                  {result.details.mx?.records && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2">Mail Servers</h5>
                      <div className="space-y-1 text-sm">
                        {Array.isArray(result.details.mx.records) ? 
                          result.details.mx.records.slice(0, 3).map((record, idx) => (
                            <div key={idx} className="font-mono text-gray-700">
                              {typeof record === 'object' ? `${record.exchange} (${record.priority})` : record}
                            </div>
                          )) :
                          <div className="font-mono text-gray-700">{result.details.mx.records}</div>
                        }
                      </div>
                    </div>
                  )}

                  {/* SMTP Details */}
                  {result.details.smtp && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2">SMTP Check</h5>
                      <div className="text-sm">
                        <p><strong>Status:</strong> {result.details.smtp.details || 'No details'}</p>
                        {result.details.smtp.confidence && (
                          <p><strong>Confidence:</strong> {result.details.smtp.confidence}%</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white shadow rounded-xl">
      <h1 className="text-3xl font-bold mb-6 text-center">Advanced Email Validation Tool</h1>

      {/* Options Panel */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3">⚙️ Validation Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={options.skipSMTP}
              onChange={(e) => setOptions({...options, skipSMTP: e.target.checked})}
            />
            <span className="text-sm">Skip SMTP (Faster)</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={options.checkDisposable}
              onChange={(e) => setOptions({...options, checkDisposable: e.target.checked})}
            />
            <span className="text-sm">Check Disposable</span>
          </label>
          <label className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={options.strictValidation}
              onChange={(e) => setOptions({...options, strictValidation: e.target.checked})}
            />
            <span className="text-sm">Strict Mode</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm">Timeout:</label>
            <select 
              value={options.timeout}
              onChange={(e) => setOptions({...options, timeout: parseInt(e.target.value)})}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
            </select>
          </div>
        </div>
      </div>

      <textarea
        className="w-full p-4 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={6}
        placeholder="Paste your emails separated by comma, space, or new lines&#10;Example:&#10;user@gmail.com&#10;test@example.com&#10;invalid-email@nonexistent.com"
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
      />

      <button
        onClick={validateEmails}
        disabled={loading || !emails.trim()}
        className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Validating Emails...
          </div>
        ) : (
          "Validate Emails"
        )}
      </button>

      {/* Error Display */}
      {results?.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-xl">❌</span>
            <span className="font-medium">Validation Error</span>
          </div>
          <p className="text-red-700 mt-1">{results.error}</p>
        </div>
      )}

      {/* Results */}
      {results && results.results && results.results.length > 0 && (
        <div className="mt-6">
          {/* Summary */}
          {results.summary && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold mb-2">📊 Validation Summary</h3>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
                <div className="text-center">
                  <div className="font-bold text-lg text-blue-600">{results.summary.total}</div>
                  <div className="text-gray-600">Total</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-green-600">{results.summary.valid}</div>
                  <div className="text-gray-600">Valid</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-red-600">{results.summary.invalid}</div>
                  <div className="text-gray-600">Invalid</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-yellow-600">{results.summary.withSuggestions || 0}</div>
                  <div className="text-gray-600">Suggestions</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-orange-600">{results.summary.disposable || 0}</div>
                  <div className="text-gray-600">Disposable</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-lg text-purple-600">{results.summary.averageConfidence || 0}%</div>
                  <div className="text-gray-600">Avg Confidence</div>
                </div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div className="overflow-x-auto">
            <h2 className="text-xl font-semibold mb-4">Validation Results</h2>
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left">Email</th>
                  <th className="border border-gray-200 p-3 text-center">Status</th>
                  <th className="border border-gray-200 p-3 text-center">Confidence</th>
                  <th className="border border-gray-200 p-3 text-center">Syntax</th>
                  <th className="border border-gray-200 p-3 text-center">Domain</th>
                  <th className="border border-gray-200 p-3 text-center">MX</th>
                  <th className="border border-gray-200 p-3 text-center">SMTP</th>
                  <th className="border border-gray-200 p-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">
                      <div className="font-mono text-sm break-all">{result.email}</div>
                      {/* Suggestions indicator */}
                      {result.suggestions && result.suggestions.length > 0 && (
                        <div className="text-xs text-yellow-600 mt-1">💡 Has suggestions</div>
                      )}
                      {/* Flags indicator */}
                      {result.flags && result.flags.length > 0 && (
                        <div className="text-xs text-orange-600 mt-1">⚠️ Has flags</div>
                      )}
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      <span className={`font-medium ${getStatusColor(result.valid, result.confidence)}`}>
                        {result.valid ? '✅ Valid' : '❌ Invalid'}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      {getConfidenceBadge(result.confidence)}
                    </td>
                    <td className={`border border-gray-200 p-3 text-center ${result.syntaxValid ? "text-green-600" : "text-red-600"}`}>
                      {result.syntaxValid ? "✅" : "❌"}
                    </td>
                    <td className={`border border-gray-200 p-3 text-center ${result.domainValid ? "text-green-600" : "text-red-600"}`}>
                      {result.domainValid ? "✅" : "❌"}
                    </td>
                    <td className={`border border-gray-200 p-3 text-center ${result.mxValid ? "text-green-600" : "text-red-600"}`}>
                      {result.mxValid ? "✅" : "❌"}
                    </td>
                    <td className={`border border-gray-200 p-3 text-center ${
                      result.smtpValid === null ? "text-gray-500" :
                      result.smtpValid ? "text-green-600" : "text-red-600"
                    }`}>
                      {result.smtpValid === null ? "⏸️" : result.smtpValid ? "✅" : "❌"}
                    </td>
                    <td className="border border-gray-200 p-3 text-center">
                      <button
                        onClick={() => setSelectedEmail(result)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detailed View Modal */}
      {selectedEmail && renderDetailModal(selectedEmail)}
    </div>
  );
}