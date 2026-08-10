"""
Government data ingestion services.

Handles fetching and normalizing data from:
- data.gov.in APIs
- Union Budget documents
- PFMS data
- eProcure tenders
- CAG audit reports
- State budget portals
"""

import httpx
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
import hashlib
import logging

from models.models import SpendingEvidence, GeographyHierarchy
from config.settings import settings

logger = logging.getLogger(__name__)


class DatagovInConnector:
    """Fetch and parse data.gov.in datasets."""

    BASE_URL = "https://www.data.gov.in/api/3/action"

    async def fetch_dataset(self, dataset_name: str) -> Dict[str, Any]:
        """Fetch a dataset from data.gov.in.

        Example dataset names:
        - "state-wise-industrial-statistics"
        - "education-statistics"
        """
        try:
            url = f"{self.BASE_URL}/package_search?q={dataset_name}&rows=100"

            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=30.0)
                response.raise_for_status()

                data = response.json()
                return data

        except Exception as e:
            logger.error(f"Error fetching data.gov.in dataset: {e}")
            return {"error": str(e)}

    async def list_education_datasets(self) -> List[Dict[str, str]]:
        """List all education-related datasets on data.gov.in."""
        datasets = []
        search_terms = [
            "education",
            "school",
            "university",
            "student",
            "literacy"
        ]

        for term in search_terms:
            try:
                url = f"{self.BASE_URL}/package_search?q={term}&rows=50"

                async with httpx.AsyncClient() as client:
                    response = await client.get(url, timeout=30.0)
                    if response.status_code == 200:
                        data = response.json()
                        for package in data.get("result", {}).get("results", []):
                            datasets.append({
                                "name": package.get("name"),
                                "title": package.get("title"),
                                "resources": len(package.get("resources", [])),
                                "last_modified": package.get("last_modified")
                            })

            except Exception as e:
                logger.warning(f"Error fetching {term}: {e}")

        return datasets


class UnionBudgetConnector:
    """Fetch and parse Union Budget data."""

    BUDGET_BASE_URL = "https://www.indiabudget.gov.in"

    async def fetch_budget_documents(
        self,
        financial_year: str
    ) -> List[Dict[str, Any]]:
        """Fetch budget documents for a financial year.

        Args:
            financial_year: Format '2024-25'

        Returns:
            List of budget documents with URLs and metadata
        """
        # TODO: Implement actual scraping/API integration
        # This requires parsing HTML or using an internal API

        logger.info(f"Budget fetching for {financial_year} - Phase 2 implementation")

        return [
            {
                "title": "Union Budget",
                "url": f"{self.BUDGET_BASE_URL}/budget",
                "year": financial_year,
                "type": "budget_document"
            }
        ]

    async def fetch_expenditure_budget(
        self,
        financial_year: str
    ) -> Optional[Dict[str, Any]]:
        """Fetch expenditure budget profile."""
        logger.info(f"Expenditure budget for {financial_year}")
        return None


class PFMSConnector:
    """Fetch Public Financial Management System data."""

    PFMS_BASE_URL = "https://pfms.nic.in"

    async def fetch_fund_releases(
        self,
        state: str,
        financial_year: str
    ) -> List[Dict[str, Any]]:
        """Fetch fund release data for a state."""
        logger.info(f"Fetching PFMS releases for {state} FY {financial_year}")

        # PFMS has restricted access
        # This is a placeholder for Phase 2 implementation
        return []

    async def fetch_expenditure_data(
        self,
        state: str,
        district: Optional[str] = None,
        financial_year: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Fetch expenditure data from PFMS."""
        logger.info(f"Fetching PFMS expenditure: {state}/{district}/{financial_year}")
        return []


class EProcureConnector:
    """Fetch eProcure tender and contract data."""

    EPROCURE_BASE_URL = "https://eprocure.gov.in"

    async def fetch_tenders(
        self,
        category: Optional[str] = None,
        state: Optional[str] = None,
        days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """Fetch recent tenders from eProcure."""
        logger.info(f"Fetching tenders - category: {category}, state: {state}")

        # eProcure has a public portal but no direct API
        # Requires web scraping or manual data entry in Phase 2
        return []

    async def fetch_awards(
        self,
        days_back: int = 30
    ) -> List[Dict[str, Any]]:
        """Fetch contract awards."""
        logger.info("Fetching eProcure awards")
        return []


class CAGConnector:
    """Fetch CAG audit report data."""

    CAG_BASE_URL = "https://cag.gov.in"

    async def fetch_audit_reports(
        self,
        state: Optional[str] = None,
        year: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Fetch CAG audit reports by state and year."""
        logger.info(f"Fetching CAG reports - state: {state}, year: {year}")

        # CAG publishes reports as PDFs
        # Requires PDF parsing and extraction in Phase 2
        return []


class DataNormalizer:
    """Normalize data from various sources into common schema."""

    @staticmethod
    def normalize_spending_record(
        raw_data: Dict[str, Any],
        source_type: str,
        source_name: str
    ) -> Dict[str, Any]:
        """Convert raw government data to SpendingEvidence schema."""
        return {
            "source_type": source_type,
            "source_name": source_name,
            "scheme_id": raw_data.get("scheme_id"),
            "scheme_name": raw_data.get("scheme_name"),
            "financial_year": raw_data.get("financial_year"),
            "amount_allocated": int(raw_data.get("allocated", 0)) * 100,  # Convert to paise
            "amount_released": int(raw_data.get("released", 0)) * 100,
            "amount_spent": int(raw_data.get("spent", 0)) * 100,
            "data_confidence": raw_data.get("confidence", 90)
        }

    @staticmethod
    def normalize_tender_record(raw_data: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize tender/contract data."""
        return {
            "source_type": "tender",
            "source_name": raw_data.get("source", "eProcure"),
            "source_document_id": raw_data.get("tender_id"),
            "scheme_name": raw_data.get("description"),
            "amount_allocated": int(raw_data.get("value", 0)) * 100,
        }


class IngestionPipeline:
    """Orchestrate data ingestion from multiple sources."""

    def __init__(self, db: Session):
        self.db = db
        self.datagov = DatagovInConnector()
        self.budget = UnionBudgetConnector()
        self.pfms = PFMSConnector()
        self.eprocure = EProcureConnector()
        self.cag = CAGConnector()
        self.normalizer = DataNormalizer()

    async def ingest_all_sources(self, financial_year: str = "2024-25"):
        """Run complete ingestion pipeline for all sources."""
        logger.info(f"Starting ingestion pipeline for FY {financial_year}")

        results = {
            "datagov": await self._ingest_datagov(),
            "budget": await self._ingest_budget(financial_year),
            "pfms": await self._ingest_pfms(financial_year),
            "eprocure": await self._ingest_eprocure(),
            "cag": await self._ingest_cag()
        }

        logger.info(f"Ingestion complete: {results}")
        return results

    async def _ingest_datagov(self) -> Dict[str, Any]:
        """Ingest education datasets from data.gov.in."""
        logger.info("Ingesting data.gov.in datasets")

        try:
            datasets = await self.datagov.list_education_datasets()
            logger.info(f"Found {len(datasets)} education datasets")
            return {"status": "success", "datasets_found": len(datasets)}
        except Exception as e:
            logger.error(f"data.gov.in ingestion failed: {e}")
            return {"status": "error", "error": str(e)}

    async def _ingest_budget(self, financial_year: str) -> Dict[str, Any]:
        """Ingest Union Budget data."""
        logger.info(f"Ingesting Union Budget for {financial_year}")

        try:
            docs = await self.budget.fetch_budget_documents(financial_year)
            logger.info(f"Found {len(docs)} budget documents")
            return {"status": "success", "documents": len(docs)}
        except Exception as e:
            logger.error(f"Budget ingestion failed: {e}")
            return {"status": "error", "error": str(e)}

    async def _ingest_pfms(self, financial_year: str) -> Dict[str, Any]:
        """Ingest PFMS data."""
        logger.info(f"Ingesting PFMS data for {financial_year}")
        return {"status": "deferred", "reason": "PFMS requires authentication"}

    async def _ingest_eprocure(self) -> Dict[str, Any]:
        """Ingest eProcure tenders."""
        logger.info("Ingesting eProcure tenders")

        try:
            tenders = await self.eprocure.fetch_tenders(days_back=30)
            logger.info(f"Found {len(tenders)} recent tenders")
            return {"status": "success", "tenders": len(tenders)}
        except Exception as e:
            logger.error(f"eProcure ingestion failed: {e}")
            return {"status": "error", "error": str(e)}

    async def _ingest_cag(self) -> Dict[str, Any]:
        """Ingest CAG audit reports."""
        logger.info("Ingesting CAG audit reports")

        try:
            reports = await self.cag.fetch_audit_reports()
            logger.info(f"Found {len(reports)} audit reports")
            return {"status": "success", "reports": len(reports)}
        except Exception as e:
            logger.error(f"CAG ingestion failed: {e}")
            return {"status": "error", "error": str(e)}

    def store_spending_record(self, data: Dict[str, Any], state_id: int):
        """Store normalized spending record in database."""
        # Calculate data hash
        data_hash = hashlib.sha256(
            json.dumps(data, sort_keys=True).encode()
        ).hexdigest()

        # Check if record already exists
        existing = self.db.query(SpendingEvidence).filter(
            SpendingEvidence.raw_data_hash == data_hash
        ).first()

        if existing:
            logger.info(f"Record already exists: {data_hash}")
            return existing

        # Create new record
        record = SpendingEvidence(
            source_type=data["source_type"],
            source_name=data["source_name"],
            scheme_id=data.get("scheme_id"),
            scheme_name=data.get("scheme_name"),
            financial_year=data.get("financial_year"),
            amount_allocated=data.get("amount_allocated"),
            amount_released=data.get("amount_released"),
            amount_spent=data.get("amount_spent"),
            applicable_state_id=state_id,
            raw_data_hash=data_hash,
            data_confidence=data.get("data_confidence", 90),
            extracted_at=datetime.utcnow()
        )

        self.db.add(record)
        self.db.commit()
        logger.info(f"Stored spending record: {record.id}")

        return record
