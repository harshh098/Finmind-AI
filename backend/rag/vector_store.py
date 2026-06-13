import os
import re
from typing import Optional
from langchain.schema import Document
from langchain_community.embeddings import SentenceTransformerEmbeddings
from langchain_community.vectorstores import FAISS

from config import settings
from rag.loader import load_qa_documents


class RAGVectorStore:
    """FAISS-backed vector store for banking knowledge retrieval."""

    def __init__(self):
        self.embeddings = SentenceTransformerEmbeddings(model_name=settings.embedding_model)
        self.vector_db: Optional[FAISS] = None
        self._initialized = False

    def initialize(self):
        """Load documents and build FAISS index (or load from disk)."""
        index_path = settings.faiss_index_path

        # Try loading existing index
        if os.path.exists(index_path):
            try:
                self.vector_db = FAISS.load_local(
                    index_path,
                    self.embeddings,
                    allow_dangerous_deserialization=True,
                )
                print(f"[RAG] Loaded FAISS index from {index_path}")
                self._initialized = True
                return
            except Exception as e:
                print(f"[RAG] Could not load index: {e}. Rebuilding...")

        # Build from documents
        docs = load_qa_documents(settings.rag_dataset_path)
        if not docs:
            print("[RAG] No documents found — RAG will be unavailable.")
            return

        self.vector_db = FAISS.from_documents(docs, self.embeddings)

        # Save index to disk
        try:
            os.makedirs(index_path, exist_ok=True)
            self.vector_db.save_local(index_path)
            print(f"[RAG] FAISS index saved to {index_path}")
        except Exception as e:
            print(f"[RAG] Could not save index: {e}")

        self._initialized = True

    def _keyword_overlap(self, query: str, doc_text: str) -> int:
        stopwords = {"what", "is", "are", "the", "a", "an", "of", "to", "for",
                     "and", "or", "in", "on", "how", "does", "do", "can", "i"}
        query_kws = {w.lower() for w in re.findall(r"\w+", query) if w.lower() not in stopwords}
        doc_kws = {w.lower() for w in re.findall(r"\w+", doc_text) if w.lower() not in stopwords}
        return len(query_kws & doc_kws)

    def search(self, query: str, k: int = 5, min_score: float = 0.55) -> Optional[Document]:
        """Semantic search with keyword re-ranking. Returns best Document or None."""
        if not self._initialized or self.vector_db is None:
            return None

        try:
            results = self.vector_db.similarity_search_with_score(query, k=k)
        except Exception as e:
            print(f"[RAG] Search error: {e}")
            return None

        best_doc = None
        best_score = -1.0

        for doc, distance in results:
            overlap = self._keyword_overlap(query, doc.page_content)
            if overlap == 0:
                continue
            # Cosine similarity (FAISS L2 → similarity)
            similarity = max(0.0, 1.0 - distance / 2.0)
            score = similarity + 0.05 * overlap

            if score > best_score:
                best_score = score
                best_doc = doc

        if best_doc and best_score >= min_score:
            best_doc.metadata["confidence"] = round(best_score, 3)
            return best_doc

        return None

    def extract_answer(self, doc: Document) -> str:
        """Pull the answer portion from a Q&A document."""
        for line in doc.page_content.split("\n"):
            if line.lower().startswith("a:"):
                return line[2:].strip()
        return doc.page_content


# Singleton
rag_store = RAGVectorStore()
