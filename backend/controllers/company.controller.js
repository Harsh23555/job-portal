import { Company } from "../models/company.model.js";
import { pickAllowedFields } from "../utils/validator.js";

export const registerCompany = async (req, res, next) => {
  try {
    const { companyName } = req.body;
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return res.status(400).json({
        message: "Valid company name is required.",
        success: false,
      });
    }

    const trimmedName = companyName.trim();
    let company = await Company.findOne({ name: trimmedName });
    if (company) {
      return res.status(400).json({
        message: "A company with this name already exists.",
        success: false,
      });
    }

    company = await Company.create({
      name: trimmedName,
      userId: req.id,
    });

    return res.status(201).json({
      message: "Company registered successfully.",
      company,
      success: true,
    });
  } catch (error) {
    console.error("[registerCompany error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getCompany = async (req, res, next) => {
  try {
    const userId = req.id;
    const companies = (await Company.find({ userId })) || [];
    return res.status(200).json({
      companies,
      success: true,
    });
  } catch (error) {
    console.error("[getCompany error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// Fetch company by ID
export const getCompanyById = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({
        message: "Company not found.",
        success: false,
      });
    }
    return res.status(200).json({
      company,
      success: true,
    });
  } catch (error) {
    console.error("[getCompanyById error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const updateCompany = async (req, res, next) => {
  try {
    const companyId = req.params.id;
    const existing = await Company.findById(companyId);

    if (!existing) {
      return res.status(404).json({
        message: "Company not found.",
        success: false,
      });
    }

    // Verify ownership
    if (existing.userId.toString() !== req.id) {
      return res.status(403).json({
        message: "Forbidden: You are not authorized to update this company.",
        success: false,
      });
    }

    const allowedData = pickAllowedFields(req.body, ["name", "description", "website", "location"]);

    const company = await Company.findByIdAndUpdate(companyId, allowedData, { new: true });

    return res.status(200).json({
      message: "Company information updated successfully.",
      company,
      success: true,
    });
  } catch (error) {
    console.error("[updateCompany error]:", error);
    return next ? next(error) : res.status(500).json({ success: false, message: "Internal server error" });
  }
};