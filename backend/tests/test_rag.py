"""
Unit tests for RAG vector store.
Run: pytest backend/tests/
"""
import pytest
from unittest.mock import patch, MagicMock
from langchain.schema import Document


class TestRAGVectorStore:
    def test_extract_answer_from_qa_doc(self):
        from rag.vector_store import RAGVectorStore
        store = RAGVectorStore.__new__(RAGVectorStore)

        doc = Document(page_content="Q: What is UPI?\nA: UPI is a payment system.")
        answer = store.extract_answer(doc)
        assert answer == "UPI is a payment system."

    def test_extract_answer_fallback(self):
        from rag.vector_store import RAGVectorStore
        store = RAGVectorStore.__new__(RAGVectorStore)

        doc = Document(page_content="Some content without A: prefix")
        answer = store.extract_answer(doc)
        assert answer == "Some content without A: prefix"

    def test_keyword_overlap(self):
        from rag.vector_store import RAGVectorStore
        store = RAGVectorStore.__new__(RAGVectorStore)

        overlap = store._keyword_overlap("what is neft transfer", "NEFT is a transfer system")
        assert overlap > 0

    def test_keyword_overlap_no_match(self):
        from rag.vector_store import RAGVectorStore
        store = RAGVectorStore.__new__(RAGVectorStore)

        overlap = store._keyword_overlap("sip mutual fund", "NEFT is a transfer system")
        assert overlap == 0


class TestRAGLoader:
    def test_load_docs_missing_folder(self, tmp_path):
        from rag.loader import load_qa_documents
        docs = load_qa_documents(str(tmp_path / "nonexistent"))
        assert docs == []

    def test_load_docs_parses_qa(self, tmp_path):
        from rag.loader import load_qa_documents
        f = tmp_path / "test.txt"
        f.write_text("Q: What is FD?\nA: Fixed Deposit is a savings product.\n\nQ: What is RD?\nA: Recurring Deposit.\n")
        docs = load_qa_documents(str(tmp_path))
        assert len(docs) == 2
        assert "FD" in docs[0].page_content
