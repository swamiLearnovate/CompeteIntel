import React, { useMemo, useState } from "react";
import HomePage from "./components/HomePage";
import InputPage from "./components/InputPage";
import LoadingView from "./components/LoadingView";
import ReportDashboard from "./components/ReportDashboard";
import { analyzeProduct, enrichCompetitor } from "./lib/api";

export default function App() {
  const [page, setPage] = useState("home");
  const [progress, setProgress] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const [analysisResult, setAnalysisResult] = useState(null);
  const [analysisError, setAnalysisError] = useState(null);

  // Competitor enrichment states
  const [selectedCompetitor, setSelectedCompetitor] = useState(null);
  const [competitorDetails, setCompetitorDetails] = useState(null);
  const [competitorLoading, setCompetitorLoading] = useState(false);
  const [competitorError, setCompetitorError] = useState(null);
  const [extraContext, setExtraContext] = useState("");

  const theme = useMemo(
    () => ({
      bg: "#f4f7ff",
      card: "#ffffff",
      primary: "#6d3fb3",
      primaryDark: "#4f2d88",
      accent: "#a57adf",
      text: "#2c2f5c",
      muted: "#6f7486",
      soft: "#ebe7ff",
    }),
    []
  );

  const cardStyle = {
    background: theme.card,
    boxShadow: "0 24px 80px rgba(80, 53, 126, 0.12)",
    border: "1px solid rgba(109, 63, 179, 0.08)",
  };

  const handleRunAnalysis = async (formData) => {
    if (!formData.product_name || !formData.website_url) {
      alert("Product Name and Website URL are required.");
      return;
    }

    // Set view to loading page
    setPage("loading");
    setProgress(5);
    setStepIndex(0);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSelectedCompetitor(null);
    setCompetitorDetails(null);
    setExtraContext(formData.extra_context || "");

    // Simulate progress bar increase in background
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(interval);
          return 95;
        }
        return prev + Math.floor(Math.random() * 5) + 2;
      });
      setStepIndex((prevStep) => {
        if (prevStep >= 2) return 2;
        return prevStep + 1;
      });
    }, 2000);

    try {
      const data = await analyzeProduct({
        product_name: formData.product_name,
        company_name: formData.company_name || null,
        website_url: formData.website_url,
        competitor_region: formData.competitor_region,
        extra_context: formData.extra_context || null,
      });

      clearInterval(interval);
      setProgress(100);
      setStepIndex(2);
      setAnalysisResult(data);
      setPage("dashboard");
    } catch (err) {
      clearInterval(interval);
      setAnalysisError(err.message || "An error occurred during analysis.");
      setPage("input");
      alert(err.message || "An error occurred during analysis.");
    }
  };

  const handleSelectCompetitor = async (index, competitor) => {
    setSelectedCompetitor(index);
    setCompetitorLoading(true);
    setCompetitorError(null);
    setCompetitorDetails(null);

    try {
      const data = await enrichCompetitor({
        product_name: analysisResult.product_name,
        competitor_region: analysisResult.competitor_region,
        product_analysis: analysisResult.analysis,
        competitor: competitor,
        target_website_text: analysisResult.scraped_data?.text || "",
        extra_context: extraContext || null,
      });
      setCompetitorDetails(data);
    } catch (err) {
      setCompetitorError(err.message || "Failed to enrich competitor");
    } finally {
      setCompetitorLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen w-full overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 18% 15%, rgba(165, 122, 223, 0.12) 0, rgba(165, 122, 223, 0.12) 10%, transparent 30%), linear-gradient(180deg, #f8f9ff 0%, #f2f5ff 100%)",
        color: theme.text,
        fontFamily:
          'Poppins, Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      {page === "home" && (
        <HomePage theme={theme} cardStyle={cardStyle} onStart={() => setPage("input")} />
      )}

      {page === "input" && (
        <InputPage
          theme={theme}
          cardStyle={cardStyle}
          onBack={() => setPage("home")}
          onSubmit={handleRunAnalysis}
        />
      )}

      {page === "loading" && (
        <LoadingView
          progress={progress}
          stepIndex={stepIndex}
          theme={theme}
        />
      )}

      {page === "dashboard" && (
        <ReportDashboard
          result={analysisResult}
          selectedCompetitor={selectedCompetitor}
          onSelectCompetitor={handleSelectCompetitor}
          competitorDetails={competitorDetails}
          competitorLoading={competitorLoading}
          competitorError={competitorError}
          theme={theme}
          onBack={() => setPage("input")}
        />
      )}
    </div>
  );
}
