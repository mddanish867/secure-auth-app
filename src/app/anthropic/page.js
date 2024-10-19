"use client"; // Add this at the top if you encounter any client-related issues

import React, { useState } from "react";

export default function Anthropic() {
    const [prompt, setPrompt] = useState("");
    const [result, setResult] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/anthropic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ prompt }),
            });
            console.log("API Response Status:", response.status); 
            const data = await response.json();
            setResult(data.result);
        } catch (error) {
            console.error("Error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold mb-4">Anthropic API Demo</h1>
            <form onSubmit={handleSubmit} className="mb-4">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full p-2 border rounded dark:text-black"
                    rows="4"
                    placeholder="Enter your prompt here"
                />
                <button
                    type="submit"
                    className="mt-2 px-4 py-2 bg-blue-500 text-white rounded"
                    disabled={isLoading}
                >
                    {isLoading ? "Generating..." : "Generate"}
                </button>
            </form>
            {result && (
                <div className="mt-4 p-4 border rounded">
                    <h2 className="text-xl font-semibold mb-2">Generated Result:</h2>
                    <p>{result}</p>
                </div>
            )}
        </div>
    );
}
