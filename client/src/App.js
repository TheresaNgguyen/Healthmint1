// src/App.js
import React, { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { BrowserRouter as Router } from "react-router-dom";
import store from "./redux/store.js";
import AppContent from "./components/AppContent.js";
import NotificationsContainer from "./components/ui/NotificationsContainer.js";
import ErrorBoundary from "./components/ErrorBoundary.js";
import { ErrorProvider } from "./contexts/ErrorContext.js";
import { HipaaComplianceProvider } from "./components/providers/HipaaComplianceProvider.js";
import NavigationProvider from "./components/providers/NavigationProvider.js";
import hipaaComplianceService from "./services/hipaaComplianceService.js";

// Import mock data utilities
import mockDataUtils from "./utils/mockDataUtils.js";
import apiService from "./services/apiService.js";

const App = () => {
  // State to track if mock data is enabled
  const [mockDataEnabled, setMockDataEnabled] = useState(
    apiService.isMockDataEnabled?.() || false
  );

  // Get the user ID for HIPAA logging from localStorage - fallback to anonymous
  const userIdentifier =
    localStorage.getItem("healthmint_wallet_address") || "anonymous";

  // Initialize mock data on app startup
  useEffect(() => {
    // Initialize mock health data
    mockDataUtils.initializeMockData();

    // Enable mock data by default to fix API errors
    if (apiService.enableMockData) {
      apiService.enableMockData();
      setMockDataEnabled(true);
    }
  }, []);

  // Log application startup for HIPAA compliance
  useEffect(() => {
    const logAppStartup = async () => {
      try {
        await hipaaComplianceService.createAuditLog("APPLICATION_STARTUP", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          userAgent: navigator.userAgent,
          screenSize: `${window.innerWidth}x${window.innerHeight}`,
          language: navigator.language,
          environment: process.env.NODE_ENV,
          usingMockData: mockDataEnabled,
        });
      } catch (error) {
        console.error("Failed to log application startup:", error);
      }
    };

    logAppStartup();

    // Log application shutdown on unmount (though this may not always fire)
    return () => {
      hipaaComplianceService
        .createAuditLog("APPLICATION_SHUTDOWN", {
          timestamp: new Date().toISOString(),
          userId: userIdentifier,
          sessionDuration: "Unknown", // Would need a session timer to track this
          usingMockData: mockDataEnabled,
        })
        .catch((error) => {
          console.error("Failed to log application shutdown:", error);
        });
    };
  }, [userIdentifier, mockDataEnabled]);

  // Toggle mock data functionality
  const toggleMockData = () => {
    if (mockDataEnabled) {
      if (apiService.disableMockData) {
        apiService.disableMockData();
      }
    } else {
      if (apiService.enableMockData) {
        apiService.enableMockData();
      }
    }
    setMockDataEnabled(!mockDataEnabled);
    window.location.reload(); // Reload to apply changes
  };

  // Reset mock data functionality
  const resetMockData = () => {
    mockDataUtils.resetMockData();
    window.location.reload(); // Reload to apply changes
  };

  // Render development tools in non-production environments
  const renderDevTools = () => {
    if (process.env.NODE_ENV !== "production") {
      return (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            background: "#f0f0f0",
            padding: "10px",
            borderRadius: "5px",
            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <button
            onClick={toggleMockData}
            style={{
              padding: "5px 10px",
              backgroundColor: mockDataEnabled ? "#d32f2f" : "#4a90e2",
              color: "white",
              border: "none",
              borderRadius: "3px",
              cursor: "pointer",
            }}
          >
            {mockDataEnabled ? "Disable Mock Data" : "Enable Mock Data"}
          </button>

          {mockDataEnabled && (
            <button
              onClick={resetMockData}
              style={{
                padding: "5px 10px",
                backgroundColor: "#388e3c",
                color: "white",
                border: "none",
                borderRadius: "3px",
                cursor: "pointer",
              }}
            >
              Reset Mock Data
            </button>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <ErrorBoundary>
      <Provider store={store}>
        <ErrorProvider userIdentifier={userIdentifier}>
          <HipaaComplianceProvider
            options={{
              autoVerifyConsent: false,
              requiredConsent: "data_sharing",
              consentPurpose: "Using Healthmint platform",
            }}
          >
            <Router>
              <NavigationProvider>
                <div className="flex flex-col min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
                  <AppContent />
                  <NotificationsContainer />
                  {renderDevTools()}
                </div>
              </NavigationProvider>
            </Router>
          </HipaaComplianceProvider>
        </ErrorProvider>
      </Provider>
    </ErrorBoundary>
  );
};

export default App;
