import React, { useState } from "react";
import * as mammoth from "mammoth";
import {BackendURL} from '../../config.js'
function Maincontent() {
  const [text, setText] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [isFileSelected, setIsFileSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [editedSummary, setEditedSummary] = useState(null);
  const [message, setMessage] = useState("");

  const API_BASE_URL = `https://summarizer-backend-hazel.vercel.app/api`;

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsFileSelected(true);
    setMessage("Processing file...");

    try {
      if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
          setText(event.target.result);
          setMessage("File uploaded successfully");
        };
        reader.readAsText(file);
      } else if (file.name.endsWith(".docx")) {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const arrayBuffer = event.target.result;
            const { value } = await mammoth.extractRawText({ arrayBuffer });
            setText(value);
            setMessage("File uploaded and processed successfully");
          } catch (error) {
            setMessage("Error processing document file. Please try again.");
            setIsFileSelected(false);
          }
        };
        reader.readAsArrayBuffer(file);
      } else {
        setMessage("Please upload a .txt or .docx file");
        setIsFileSelected(false);
      }
    } catch (error) {
      setMessage("Error uploading file. Please try again.");
      setIsFileSelected(false);
    }

    setTimeout(() => setMessage(""), 3000);
  };

  const handleTextareaChange = (e) => {
    setText(e.target.value);
    setIsFileSelected(false);
    setSummary(null);
  };

  const generateSummary = async () => {
    if (!text.trim()) {
      setMessage("Please enter or upload a transcript first");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/start-session`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transcript: text,
          userInstruction: userPrompt || "Generate a clear, concise summary"
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setEditedSummary(data.summary);
        setSessionId(data.sessionId);
        setMessage("Summary generated successfully");
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      setMessage("Error connecting to server. Please try again.");
    }

    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const refineSummary = async () => {
    if (!sessionId || !userPrompt.trim()) {
      setMessage("Please enter a refinement instruction");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/summarize`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          sessionId: sessionId,
          prompt: userPrompt
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data.summary);
        setEditedSummary(data.summary);
        setMessage("Summary refined successfully");
        setUserPrompt("");
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error refining summary:", error);
      setMessage("Error refining summary. Please try again.");
    }

    setLoading(false);
    setTimeout(() => setMessage(""), 3000);
  };

  const formatSummaryForEmail = (summary) => {
    const bulletPoints = Array.isArray(summary.initial_bullet_summary) 
      ? summary.initial_bullet_summary 
      : [summary.initial_bullet_summary];
    
    const notes = Array.isArray(summary.clarifications_or_notes) 
      ? summary.clarifications_or_notes 
      : [];

    let emailBody = "MEETING SUMMARY\n\n";
    emailBody += "KEY POINTS:\n";
    bulletPoints.forEach((point, index) => {
      emailBody += `${index + 1}. ${point}\n`;
    });
    
    emailBody += "\nDETAILED SUMMARY:\n";
    emailBody += summary.user_customized_summary + "\n\n";
    
    if (notes.length > 0) {
      emailBody += "ADDITIONAL NOTES:\n";
      notes.forEach((note, index) => {
        emailBody += `• ${note}\n`;
      });
      emailBody += "\n";
    }
    
    emailBody += "This summary was generated automatically and may have been edited for clarity.";
    
    return emailBody;
  };

  const openEmailClient = () => {
    if (!editedSummary) {
      setMessage("No summary available to email");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const emailBody = formatSummaryForEmail(editedSummary);
    const subject = encodeURIComponent("Meeting Summary");
    const body = encodeURIComponent(emailBody);
    const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
    
    window.open(mailtoLink, '_blank');
    setMessage("Opening your email client...");
    setTimeout(() => setMessage(""), 3000);
  };

  const copyToClipboard = async () => {
    if (!editedSummary) {
      setMessage("No summary available to copy");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const textToCopy = formatSummaryForEmail(editedSummary);

    try {
      await navigator.clipboard.writeText(textToCopy);
      setMessage("Summary copied to clipboard");
    } catch (err) {
      setMessage("Failed to copy to clipboard. Please try again.");
    }
    setTimeout(() => setMessage(""), 3000);
  };

  const downloadSummary = () => {
    if (!editedSummary) {
      setMessage("No summary available to download");
      setTimeout(() => setMessage(""), 3000);
      return;
    }

    const summaryText = formatSummaryForEmail(editedSummary);
    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `meeting-summary-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setMessage("Summary downloaded successfully");
    setTimeout(() => setMessage(""), 3000);
  };

  const handleSummaryEdit = (field, value) => {
    setEditedSummary({
      ...editedSummary,
      [field]: value
    });
  };

  const handleBulletEdit = (index, value) => {
    const newBullets = [...editedSummary.initial_bullet_summary];
    newBullets[index] = value;
    setEditedSummary({
      ...editedSummary,
      initial_bullet_summary: newBullets
    });
  };

  const handleNotesEdit = (index, value) => {
    const newNotes = [...(editedSummary.clarifications_or_notes || [])];
    newNotes[index] = value;
    setEditedSummary({
      ...editedSummary,
      clarifications_or_notes: newNotes
    });
  };

  const addBulletPoint = () => {
    const newBullets = [...(editedSummary.initial_bullet_summary || []), ""];
    setEditedSummary({
      ...editedSummary,
      initial_bullet_summary: newBullets
    });
  };

  const removeBulletPoint = (index) => {
    const newBullets = editedSummary.initial_bullet_summary.filter((_, i) => i !== index);
    setEditedSummary({
      ...editedSummary,
      initial_bullet_summary: newBullets
    });
  };

  return (
    <div className="w-full min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center sm:text-left">
            <h1 className="text-3xl sm:text-4xl font-light text-white">
              Meeting Notes Summarizer
            </h1>
            <p className="text-gray-400 mt-2 text-sm sm:text-base font-light">
              Generate professional summaries from meeting transcripts
            </p>
          </div>
        </div>
      </div>

      {/* Message Bar */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className={`mt-6 p-4 border ${
            message.includes("Error") || message.includes("Failed") ? 
            "bg-gray-900 text-white border-red-500" : 
            "bg-gray-900 text-white border-gray-600"
          }`}>
            <p className="text-sm font-light">{message}</p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 lg:gap-12">
          {/* Left Section - Input */}
          <div className="space-y-8">
            {/* File Upload Section */}
            <div className="bg-gray-900 border border-gray-700 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-light text-white mb-2">
                  Document Upload
                </h2>
                <p className="text-gray-400 text-sm font-light">
                  Upload your meeting transcript or enter text manually
                </p>
              </div>

              <label className={`w-full cursor-pointer flex flex-col items-center justify-center border-2 border-dashed p-8 transition-all duration-200 mb-6 ${
                  isFileSelected ? 
                  "border-white bg-gray-800" : 
                  "border-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="file"
                  accept=".txt,.docx"
                  className="hidden"
                  onChange={handleFileUpload}
                  disabled={text && !isFileSelected}
                />
                <div className="text-center">
                  <div className="text-2xl mb-4 text-gray-500">
                    {isFileSelected ? "✓" : "↑"}
                  </div>
                  <span className="text-gray-300 font-light block mb-2">
                    {isFileSelected ? "File Selected" : "Click to Upload Document"}
                  </span>
                  <span className="text-gray-500 text-sm font-light">
                    Supports .txt and .docx files
                  </span>
                </div>
              </label>

              <div className="flex items-center my-6">
                <div className="flex-grow border-t border-gray-600"></div>
                <span className="mx-4 text-gray-500 font-light text-sm">OR</span>
                <div className="flex-grow border-t border-gray-600"></div>
              </div>

              <textarea
                placeholder="Enter your meeting transcript here..."
                rows="8"
                value={text}
                onChange={handleTextareaChange}
                disabled={isFileSelected}
                className="w-full px-4 py-3 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-white focus:outline-none resize-none disabled:bg-gray-800 disabled:cursor-not-allowed text-sm font-light"
              />
            </div>

            {/* Instructions Section */}
            <div className="bg-gray-900 border border-gray-700 p-8">
              <div className="mb-6">
                <h2 className="text-xl font-light text-white mb-2">
                  Summary Instructions
                </h2>
                <p className="text-gray-400 text-sm font-light">
                  Provide specific instructions for how you want the summary formatted
                </p>
              </div>
              
              <textarea
                placeholder="e.g., 'Summarize in bullet points for executives', 'Highlight only action items', 'Create email-ready format'"
                rows="4"
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                className="w-full px-4 py-3 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-white focus:outline-none resize-none text-sm font-light mb-6"
              />
              
              <div className="flex flex-col sm:flex-row gap-4">
                <button 
                  onClick={generateSummary}
                  disabled={loading || !text.trim()}
                  className="flex-1 bg-white text-black px-6 py-3 hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed font-light transition-all duration-200"
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                      Generating Summary...
                    </div>
                  ) : (
                    "Generate Summary"
                  )}
                </button>
                
                {summary && (
                  <button 
                    onClick={refineSummary}
                    disabled={loading || !userPrompt.trim()}
                    className="flex-1 bg-gray-700 text-white px-6 py-3 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed font-light transition-all duration-200"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Refining Summary...
                      </div>
                    ) : (
                      "Refine Summary"
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Section - Summary */}
          <div className="space-y-8">
            {editedSummary && (
              <div className="bg-gray-900 border border-gray-700 p-8">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-xl font-light text-white mb-2">
                      Generated Summary
                    </h2>
                    <p className="text-gray-400 text-sm font-light">
                      Review and edit your summary before sharing
                    </p>
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <button
                      onClick={copyToClipboard}
                      className="border border-gray-600 hover:border-white text-white px-4 py-2 transition-colors duration-200 text-sm font-light"
                    >
                      Copy
                    </button>
                    <button
                      onClick={downloadSummary}
                      className="border border-gray-600 hover:border-white text-white px-4 py-2 transition-colors duration-200 text-sm font-light"
                    >
                      Download
                    </button>
                    <button
                      onClick={openEmailClient}
                      className="bg-white hover:bg-gray-200 text-black px-4 py-2 transition-all duration-200 text-sm font-light"
                    >
                      Email
                    </button>
                  </div>
                </div>

                <div className="space-y-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <label className="block text-sm font-light text-white">
                        Key Points
                      </label>
                      <button
                        onClick={addBulletPoint}
                        className="text-white hover:text-gray-300 text-sm font-light underline"
                      >
                        Add Point
                      </button>
                    </div>
                    <div className="space-y-3">
                      {editedSummary.initial_bullet_summary?.map((bullet, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <input
                            type="text"
                            value={bullet}
                            onChange={(e) => handleBulletEdit(index, e.target.value)}
                            className="flex-1 px-4 py-3 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-white focus:outline-none text-sm font-light"
                          />
                          {editedSummary.initial_bullet_summary.length > 1 && (
                            <button
                              onClick={() => removeBulletPoint(index)}
                              className="text-gray-500 hover:text-white px-2"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-light text-white mb-4">
                      Detailed Summary
                    </label>
                    <textarea
                      rows="8"
                      value={editedSummary.user_customized_summary || ""}
                      onChange={(e) => handleSummaryEdit("user_customized_summary", e.target.value)}
                      className="w-full px-4 py-3 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-white focus:outline-none resize-none text-sm font-light"
                    />
                  </div>

                  {editedSummary.clarifications_or_notes?.length > 0 && (
                    <div>
                      <label className="block text-sm font-light text-white mb-4">
                        Additional Notes
                      </label>
                      <div className="space-y-3">
                        {editedSummary.clarifications_or_notes.map((note, index) => (
                          <input
                            key={index}
                            type="text"
                            value={note}
                            onChange={(e) => handleNotesEdit(index, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-600 bg-gray-800 text-white placeholder-gray-400 focus:border-white focus:outline-none text-sm font-light"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Placeholder when no summary */}
            {!summary && (
              <div className="border-2 border-dashed border-gray-700 p-16 text-center">
                <div className="text-gray-600 text-4xl mb-6">◦</div>
                <p className="text-gray-400 text-lg mb-2 font-light">
                  Summary Preview
                </p>
                <p className="text-gray-500 text-sm font-light">
                  Upload a transcript and generate a summary to see results here
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Maincontent;