import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";

// ── Config ────────────────────────────────────────────────────────────────────
const DEBOUNCE_MS    = 400;
const MIN_QUERY_LEN  = 2;

// ── Main search hook ──────────────────────────────────────────────────────────
export function useSearch() {
  const [query,        setQuery]        = useState("");
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(false);
  const [totalResults, setTotalResults] = useState(0);

  const cancelRef  = useRef(null);
  const debounceRef= useRef(null);

  // ── Core search — AniList only ────────────────────────────────────────────
  const search = useCallback(async (q, pg = 1, append = false) => {
    if (!q || q.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      setError(null);
      setHasMore(false);
      return;
    }

    // Cancel previous request
    if (cancelRef.current) cancelRef.current.abort();
    cancelRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const res = await axios.get("/api/anime/search", {
        params: { q: q.trim(), page: pg },
        signal: cancelRef.current.signal,
      });

      const pageInfo = res.data.results?.pageInfo || {};
      const items    = res.data.results?.media    ||
                       res.data.results            || [];

      setResults((prev) => append ? [...prev, ...items] : items);
      setTotalResults(pageInfo.total || items.length);
      setHasMore(pageInfo.hasNextPage || false);

    } catch (err) {
      if (axios.isCancel(err) || err.name === "CanceledError") return;
      setError(err.response?.data?.error || "Search failed. Try again.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Debounced query watcher ───────────────────────────────────────────────
  useEffect(() => {
    clearTimeout(debounceRef.current);

    if (!query || query.trim().length < MIN_QUERY_LEN) {
      setResults([]);
      setError(null);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setPage(1);
    debounceRef.current = setTimeout(() => {
      search(query, 1, false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    const next = page + 1;
    setPage(next);
    search(query, next, true);
  }, [hasMore, loading, page, query, search]);

  // ── Manual trigger ────────────────────────────────────────────────────────
  const triggerSearch = useCallback(() => {
    setPage(1);
    search(query, 1, false);
  }, [query, search]);

  // ── Clear ─────────────────────────────────────────────────────────────────
  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setError(null);
    setHasMore(false);
    setTotalResults(0);
    setPage(1);
    if (cancelRef.current) cancelRef.current.abort();
  }, []);

  return {
    query,
    results,
    loading,
    error,
    page,
    hasMore,
    totalResults,
    setQuery,
    loadMore,
    triggerSearch,
    clear,
  };
}

// ── Trending hook ─────────────────────────────────────────────────────────────
export function useTrending(page = 1) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/anime/trending", {
          params: { page, perPage: 20 },
        });
        if (!cancelled) setData(res.data.results || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Failed to load trending");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [page]);

  return { data, loading, error };
}

// ── Seasonal hook ─────────────────────────────────────────────────────────────
export function useSeasonal(season, year) {
  const [data,    setData]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!season || !year) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetch() {
      setLoading(true);
      setError(null);
      try {
        const res = await axios.get("/api/anime/seasonal", {
          params: { season, year },
        });
        if (!cancelled) setData(res.data.results || []);
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.error || "Failed to load seasonal");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetch();
    return () => { cancelled = true; };
  }, [season, year]);

  return { data, loading, error };
}