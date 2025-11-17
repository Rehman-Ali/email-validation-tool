"use client";
import { useState, useEffect } from "react";
import { Mail, Lock, Eye, EyeOff, LogOut } from "lucide-react";

// Login Component
function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Simulate a small delay for better UX
    setTimeout(() => {
      if (email === "admin@gmail.com" && password === "seositesoft@2K25") {
        // Store auth token in localStorage
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userEmail", email);
        localStorage.setItem("loginTime", new Date().toISOString());
        onLogin();
      } else {
        setError("Invalid email or password. Please try again.");
      }
      setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Validator</h1>
          <p className="text-gray-600">Sign in to access the validation tool</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                <span className="text-red-600 text-sm">⚠️</span>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

         
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Developed by SeoSiteSoft
        </p>
      </div>
    </div>
  );
}

// Main Email Validator App (Your existing code)
function EmailValidatorApp({ onLogout, userEmail }) {
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
            <div>
              <h4 className="font-semibold text-black mb-3">Validation Steps</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className={`p-3 rounded-lg border ${result.syntaxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.syntaxValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black">Syntax</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Email format check</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.domainValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.domainValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black">Domain</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Domain validity</p>
                </div>

                <div className={`p-3 rounded-lg border ${result.mxValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className="flex items-center gap-2">
                    <span>{result.mxValid ? '✅' : '❌'}</span>
                    <span className="font-medium text-black">MX Records</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">Mail server check</p>
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

            {result.details && (
              <div>
                <h4 className="font-semibold text-black mb-3">🔧 Technical Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Logout */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-black">Advanced Email Validation Tool</h1>
            <p className="text-sm text-gray-600 mt-1">Logged in as: {userEmail}</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors border border-red-200"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>

        <div className="bg-white shadow-lg rounded-xl p-6">
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

          {selectedEmail && renderDetailModal(selectedEmail)}
        </div>
      </div>
    </div>
  );
}

// Main App with Authentication Logic
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = () => {
      const authStatus = localStorage.getItem("isAuthenticated");
      const savedEmail = localStorage.getItem("userEmail");
      
      if (authStatus === "true" && savedEmail) {
        setIsAuthenticated(true);
        setUserEmail(savedEmail);
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const handleLogin = () => {
    const savedEmail = localStorage.getItem("userEmail");
    setIsAuthenticated(true);
    setUserEmail(savedEmail || "");
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userEmail");
    localStorage.removeItem("loginTime");
    
    // Update state
    setIsAuthenticated(false);
    setUserEmail("");
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Show main app if authenticated
  return <EmailValidatorApp onLogout={handleLogout} userEmail={userEmail} />;
}