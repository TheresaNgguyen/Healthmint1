// src/components/UserRegistration.js
import React, { useState, useCallback } from "react";
import PropTypes from "prop-types";
import { useDispatch } from "react-redux";
import { Save, User, Briefcase, AlertCircle, CheckCircle } from "lucide-react";
import { setRole } from "../redux/slices/roleSlice.js";
import { addNotification } from "../redux/slices/notificationSlice.js";
import userService from "../services/userService.js";
import hipaaComplianceService from "../services/hipaaComplianceService.js";

/**
 * User Registration Component
 * 
 * Handles new user registration with HIPAA compliant data collection
 */
const UserRegistration = ({ walletAddress, onComplete }) => {
  const dispatch = useDispatch();
  
  // Form state
  const [formState, setFormState] = useState({
    name: "",
    email: "",
    age: "",
    role: "",
    agreeToTerms: false,
    agreeToHipaa: false,
    address: walletAddress || "",
  });
  
  // Registration step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRole, setSelectedRole] = useState(null);
  
  // Handle input changes
  const handleInputChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  }, []);
  
  // Handle role selection
  const handleRoleSelect = useCallback((role) => {
    setSelectedRole(role);
    setFormState(prev => ({
      ...prev,
      role
    }));
  }, []);
  
  // Move to next step
  const nextStep = useCallback(() => {
    setStep(prevStep => prevStep + 1);
  }, []);
  
  // Move to previous step
  const prevStep = useCallback(() => {
    setStep(prevStep => Math.max(1, prevStep - 1));
  }, []);
  
  // Create HIPAA consent
  const createHipaaConsent = useCallback(async () => {
    try {
      // Log consent for HIPAA compliance
      await hipaaComplianceService.recordConsent(
        hipaaComplianceService.CONSENT_TYPES.DATA_SHARING,
        true, 
        {
          userId: walletAddress,
          timestamp: new Date().toISOString(),
          ip: "client-collected", // Server will log actual IP
          details: "Initial user registration consent"
        }
      );
      
      // Create audit log entry
      await hipaaComplianceService.createAuditLog("REGISTRATION_CONSENT", {
        userId: walletAddress,
        consentType: "HIPAA_DATA_SHARING",
        timestamp: new Date().toISOString()
      });
      
      return true;
    } catch (error) {
      console.error("Error recording HIPAA consent:", error);
      return false;
    }
  }, [walletAddress]);
  
  // Handle form submission
  const handleSubmit = useCallback(async (e) => {
    if (e) e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Validate form
      if (!formState.name.trim()) {
        throw new Error("Name is required");
      }
      
      if (!formState.role) {
        throw new Error("Please select a role");
      }
      
      if (!formState.agreeToTerms) {
        throw new Error("You must agree to the terms and conditions");
      }
      
      if (!formState.agreeToHipaa) {
        throw new Error("You must acknowledge the HIPAA consent");
      }
      
      // Handle HIPAA consent
      const hipaaConsentRecorded = await createHipaaConsent();
      if (!hipaaConsentRecorded) {
        throw new Error("Failed to record HIPAA consent. Please try again.");
      }
      
      // Register user with the service
      const userData = {
        ...formState,
        address: walletAddress,
        registrationDate: new Date().toISOString()
      };
      
      // Sanitize data for HIPAA compliance
      const sanitizedData = hipaaComplianceService.sanitizeData(userData, {
        excludeFields: ["agreeToTerms", "agreeToHipaa"],
      });
      
      // Register the user
      await userService.registerUser(sanitizedData);
      
      // Set the role in Redux
      dispatch(setRole(formState.role));
      
      // Create audit log for registration
      await hipaaComplianceService.createAuditLog("USER_REGISTRATION", {
        userId: walletAddress,
        role: formState.role,
        timestamp: new Date().toISOString()
      });
      
      // Success notification
      dispatch(
        addNotification({
          type: "success",
          message: "Registration completed successfully!",
          duration: 5000,
        })
      );
      
      // Call the onComplete callback
      if (onComplete) {
        onComplete(sanitizedData);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError(err.message || "Registration failed. Please try again.");
      
      dispatch(
        addNotification({
          type: "error",
          message: err.message || "Registration failed. Please try again.",
          duration: 5000,
        })
      );
    } finally {
      setLoading(false);
    }
  }, [
    formState, 
    walletAddress, 
    createHipaaConsent, 
    dispatch, 
    onComplete
  ]);
  
  // Render different steps
  const renderStep = () => {
    switch (step) {
      case 1:
        return renderRoleSelection();
      case 2:
        return renderPersonalInfo();
      case 3:
        return renderHipaaConsent();
      default:
        return renderRoleSelection();
    }
  };
  
  // Step 1: Role Selection
  const renderRoleSelection = () => (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6">Choose Your Role</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Patient Role Card */}
        <div
          className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedRole === "patient" ? "ring-2 ring-blue-500" : ""
          }`}
          onClick={() => handleRoleSelect("patient")}
        >
          <div className="flex flex-col items-center">
            <div className="bg-blue-100 p-4 rounded-full mb-4">
              <User size={32} className="text-blue-600" />
            </div>
            <h3 className="text-xl font-medium mb-2">Patient</h3>
            <p className="text-gray-600 text-center">
              Share and manage your health data securely. Control who can access 
              your medical information.
            </p>
          </div>
        </div>
        
        {/* Researcher Role Card */}
        <div
          className={`bg-white rounded-lg shadow-md p-6 cursor-pointer transition-all hover:shadow-lg ${
            selectedRole === "researcher" ? "ring-2 ring-purple-500" : ""
          }`}
          onClick={() => handleRoleSelect("researcher")}
        >
          <div className="flex flex-col items-center">
            <div className="bg-purple-100 p-4 rounded-full mb-4">
              <Briefcase size={32} className="text-purple-600" />
            </div>
            <h3 className="text-xl font-medium mb-2">Researcher</h3>
            <p className="text-gray-600 text-center">
              Access anonymized health data for research with proper consent and 
              HIPAA compliance.
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={nextStep}
          disabled={!selectedRole || loading}
          className={`px-6 py-2 rounded-lg bg-blue-500 text-white flex items-center ${
            !selectedRole || loading ? "bg-blue-300 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
        >
          Next Step
        </button>
      </div>
    </div>
  );
  
  // Step 2: Personal Information
  const renderPersonalInfo = () => (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6">Personal Information</h2>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formState.email}
            onChange={handleInputChange}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">Optional but recommended for notifications</p>
        </div>
        
        <div>
          <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
            Age
          </label>
          <input
            type="number"
            id="age"
            name="age"
            value={formState.age}
            onChange={handleInputChange}
            min="0"
            max="120"
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Wallet Address
          </label>
          <input
            type="text"
            id="address"
            name="address"
            value={walletAddress || ""}
            disabled
            className="w-full rounded-md border-gray-300 bg-gray-100 shadow-sm"
          />
          <p className="mt-1 text-xs text-gray-500">Connected wallet address (non-editable)</p>
        </div>
      </div>
      
      <div className="mt-8 flex justify-between">
        <button
          type="button"
          onClick={prevStep}
          className="px-6 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Back
        </button>
        
        <button
          type="button"
          onClick={nextStep}
          disabled={!formState.name || loading}
          className={`px-6 py-2 rounded-lg bg-blue-500 text-white flex items-center ${
            !formState.name || loading ? "bg-blue-300 cursor-not-allowed" : "hover:bg-blue-600"
          }`}
        >
          Next Step
        </button>
      </div>
    </div>
  );
  
  // Step 3: HIPAA Consent
  const renderHipaaConsent = () => (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold mb-6">HIPAA Consent</h2>
      
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 mb-6">
        <div className="flex items-start mb-4">
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle size={20} className="text-blue-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-blue-800">
              Important: HIPAA Privacy Notice
            </h3>
          </div>
        </div>
        
        <div className="text-blue-700 text-sm">
          <p className="mb-4">
            HealthMint is committed to protecting your health information in accordance 
            with the Health Insurance Portability and Accountability Act (HIPAA). 
            By using our platform, you understand that:
          </p>
          
          <ul className="list-disc pl-5 space-y-2 mb-4">
            <li>Your health information will be stored securely on the blockchain</li>
            <li>You control who has access to your health data</li>
            <li>All data access is logged and auditable</li>
            <li>Your data may be used in anonymized form for research with your consent</li>
            <li>You can revoke access to your data at any time</li>
          </ul>
          
          <p>
            For more details, please review our complete{" "}
            <a href="/privacy" className="text-blue-600 underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/terms" className="text-blue-600 underline">
              Terms of Service
            </a>
            .
          </p>
        </div>
      </div>
      
      <div className="space-y-4">
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={formState.agreeToTerms}
            onChange={handleInputChange}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            I agree to the HealthMint{" "}
            <a href="/terms" className="text-blue-600 underline">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href="/privacy" className="text-blue-600 underline">
              Privacy Policy
            </a>
            .
          </span>
        </label>
        
        <label className="flex items-start cursor-pointer">
          <input
            type="checkbox"
            name="agreeToHipaa"
            checked={formState.agreeToHipaa}
            onChange={handleInputChange}
            className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="ml-2 text-sm text-gray-700">
            I acknowledge that I have rea