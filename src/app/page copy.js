"use client";
import { useState } from "react";

export default function App() {
  const [emails, setEmails] = useState("");
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [options, setOptions] = useState({
    skipSMTP: true,
    checkDisposable: true,
    strictValidation: true,
    timeout: 12000
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    
    // Parse CSV manually (simple parser)
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] || '';
        return obj;
      }, {});
    });

    setCsvHeaders(headers);
    setCsvData(rows);
    setShowColumnSelector(true);
  };

  const handleColumnSelect = (columnName) => {
    const emailsFromCsv = csvData
      .map(row => row[columnName])
      .filter(email => email && email.trim())
      .join('\n');
    
    setEmails(emailsFromCsv);
    setShowColumnSelector(false);
    setCsvHeaders([]);
    setCsvData([]);
  };

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
              <h3 className="text-xl text-black font-bold">Detailed Analysis</h3>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <p className="text-lg text-black font-mono mt-2 break-all">{result.email}</p>
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
              <h4 className="font-semibold text-black mb-3">Validation Steps</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border ${result.syntaxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.syntaxValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black ">Syntax</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Email format check</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.domainValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.domainValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black">Domain</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 text-black">Domain validity</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.mxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.mxValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black">MX Records</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 ">Mail server check</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.smtpValid === null ? 'bg-gray-50 border-gray-200' :
                  result.smtpValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span>
                      {result.smtpValid === null ? '⏸️' : result.smtpValid ? '✅' : '❌'}
                    </span>
                    <span className="font-medium text-black">SMTP</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.smtpValid === null ? 'Skipped' : 'Delivery check'}
                  </p>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            {result.details && (
              <div>
                <h4 className="font-semibold text-black mb-3">🔧 Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* MX Records */}
                  {result.details.mx?.records && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium mb-2 text-black">Mail Servers</h5>
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
                      <h5 className="font-medium mb-2 text-black">SMTP Check</h5>
                      <div className="text-sm text-black">
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
      <h1 className="text-3xl font-bold mb-6 text-center text-black">Advanced Email Validation Tool</h1>

      {/* Options Panel */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-3 text-black">⚙️ Validation Options</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.skipSMTP}
              onChange={(e) => setOptions({ ...options, skipSMTP: e.target.checked })}
            />
            <span className="text-sm text-black">Skip SMTP (Faster)</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.checkDisposable}
              onChange={(e) => setOptions({ ...options, checkDisposable: e.target.checked })}
            />
            <span className="text-sm text-black">Check Disposable</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={options.strictValidation}
              onChange={(e) => setOptions({ ...options, strictValidation: e.target.checked })}
            />
            <span className="text-sm text-black">Strict Mode</span>
          </label>
          <div className="flex items-center gap-2">
            <label className="text-sm text-black">Timeout:</label>
            <select
              value={options.timeout}
              onChange={(e) => setOptions({ ...options, timeout: parseInt(e.target.value) })}
              className="border text-black rounded px-2 py-1 text-sm"
            >
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
              <option value={15000}>15s</option>
            </select>
          </div>
        </div>
      </div>

      {/* CSV Upload Section */}
      <div className="mb-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-black">📁 Import from CSV</h3>
        </div>
        <div className="flex items-center gap-4">
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              Choose CSV File
            </div>
          </label>
          <p className="text-sm text-gray-600">Upload a CSV file and select the email column</p>
        </div>
      </div>

      <textarea
        className="w-full p-4 border-2 text-black rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        rows={6}
        placeholder="Paste your emails separated by comma, space, or new lines&#10;Example:&#10;user@gmail.com&#10;test@example.com&#10;invalid-email@nonexistent.com&#10;&#10;Or upload a CSV file above"
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
            <div className="w-4 h-4 border-2 text-white border-white border-t-transparent rounded-full animate-spin"></div>
            Validating Emails...
          </div>
        ) : (
          "Validate Emails"
        )}
      </button>

      {/* Column Selector Modal */}
      {showColumnSelector && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6">
            <h3 className="text-xl font-bold text-black mb-4">Select Email Column</h3>
            <p className="text-gray-600 mb-4">Choose which column contains the email addresses:</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {csvHeaders.map((header, index) => (
                <button
                  key={index}
                  onClick={() => handleColumnSelect(header)}
                  className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                >
                  <div className="font-semibold text-black mb-1">{header}</div>
                  <div className="text-xs text-gray-500 truncate">
                    Sample: {csvData[0]?.[header] || 'N/A'}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowColumnSelector(false);
                setCsvHeaders([]);
                setCsvData([]);
              }}
              className="mt-4 w-full py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {results?.error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800">
            <span className="text-xl">❌</span>
            <span className="font-medium text-black">Validation Error</span>
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
              <h3 className="font-semibold mb-2 text-black">📊 Validation Summary</h3>
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
            <h2 className="text-xl font-semibold mb-4 text-black">Validation Results</h2>
            <table className="w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 p-3 text-left text-black">Email</th>
                  <th className="border border-gray-200 p-3 text-center text-black">Status</th>
                  <th className="border border-gray-200 p-3 text-center text-black">Confidence</th>
                  <th className="border border-gray-200 p-3 text-center text-black">Syntax</th>
                  <th className="border border-gray-200 p-3 text-center text-black">Domain</th>
                  <th className="border border-gray-200 p-3 text-center text-black">MX</th>
                  <th className="border border-gray-200 p-3 text-center text-black">SMTP</th>
                  <th className="border border-gray-200 p-3 text-center text-black">Details</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((result, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 p-3">
                      <div className="font-mono text-sm break-all text-black">{result.email}</div>
                    </td>
                    <td className="border border-gray-200 p-3 text-black text-center">
                      <span className={`font-medium ${getStatusColor(result.valid, result.confidence)}`}>
                        {result.valid ? '✅ Valid' : '❌ Invalid'}
                      </span>
                    </td>
                    <td className="border border-gray-200 p-3 text-center text-black">
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
                    <td className={`border border-gray-200 p-3 text-center ${result.smtpValid === null ? "text-gray-500" :
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