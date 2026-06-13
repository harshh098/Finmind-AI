import os
import re
from typing import List
from langchain.schema import Document


def load_qa_documents(folder: str) -> List[Document]:
    """
    Load Q&A pairs from text files structured as:
      Q: <question>
      A: <answer>
    Returns a list of LangChain Document objects.
    """
    docs = []
    q_pattern = re.compile(r"^Q:\s*(.*)", re.IGNORECASE)
    a_pattern = re.compile(r"^A:\s*(.*)", re.IGNORECASE)
    current_q = None

    if not os.path.isdir(folder):
        print(f"[RAG] Warning: dataset folder not found: {folder}")
        return docs

    for filename in sorted(os.listdir(folder)):
        if not filename.endswith(".txt"):
            continue
        filepath = os.path.join(folder, filename)
        source = filename.replace(".txt", "")

        try:
            with open(filepath, encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue

                    q_match = q_pattern.match(line)
                    a_match = a_pattern.match(line)

                    if q_match:
                        current_q = q_match.group(1).strip()
                    elif a_match and current_q:
                        answer = a_match.group(1).strip()
                        docs.append(
                            Document(
                                page_content=f"Q: {current_q}\nA: {answer}",
                                metadata={"source": source, "question": current_q},
                            )
                        )
                        current_q = None
        except Exception as e:
            print(f"[RAG] Error reading {filename}: {e}")

    print(f"[RAG] Loaded {len(docs)} Q&A pairs from {folder}")
    return docs
