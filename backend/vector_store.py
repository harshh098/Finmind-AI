class VectorStore:
    def __init__(self):
        self._embeddings = None
        self._vectorstore = None

    @property
    def embeddings(self):
        if self._embeddings is None:
            self._embeddings = SentenceTransformerEmbeddings(
                model_name=settings.embedding_model
            )
        return self._embeddings