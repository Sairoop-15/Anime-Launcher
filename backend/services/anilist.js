const axios = require("axios");

// ── Config ────────────────────────────────────────────────────────────────────
const ANILIST_URL = "https://graphql.anilist.co";

const api = axios.create({
  baseURL: ANILIST_URL,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// ── Fragments ─────────────────────────────────────────────────────────────────
const MEDIA_FIELDS = `
  id
  title {
    romaji
    english
    native
  }
  description(asHtml: false)
  coverImage {
    extraLarge
    large
    color
  }
  bannerImage
  averageScore
  popularity
  status
  episodes
  duration
  season
  seasonYear
  format
  genres
  studios(isMain: true) {
    nodes { name }
  }
  trailer {
    id
    site
  }
  nextAiringEpisode {
    episode
    timeUntilAiring
  }
`;

// ── Search anime by title ─────────────────────────────────────────────────────
async function searchAnime(query, page = 1, perPage = 20) {
  const gql = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo {
          total
          currentPage
          lastPage
          hasNextPage
        }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const { data } = await api.post("", {
      query: gql,
      variables: { search: query, page, perPage },
    });

    if (data.errors) throw new Error(data.errors[0].message);
    return data.data.Page;
  } catch (err) {
    throw new Error(`AniList search failed: ${err.message}`);
  }
}

// ── Get full anime details by AniList ID ──────────────────────────────────────
async function getAnimeById(id) {
  const gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              coverImage { large }
              format
              status
            }
          }
        }
        recommendations(sort: RATING_DESC, perPage: 6) {
          nodes {
            mediaRecommendation {
              id
              title { romaji english }
              coverImage { large }
              averageScore
            }
          }
        }
        characters(sort: ROLE, perPage: 6) {
          edges {
            role
            node {
              name { full }
              image { medium }
            }
          }
        }
      }
    }
  `;

  try {
    const { data } = await api.post("", {
      query: gql,
      variables: { id: parseInt(id) },
    });

    if (data.errors) throw new Error(data.errors[0].message);
    return data.data.Media;
  } catch (err) {
    throw new Error(`AniList fetch failed: ${err.message}`);
  }
}

// ── Get seasonal anime ────────────────────────────────────────────────────────
async function getSeasonalAnime(season, year, page = 1, perPage = 20) {
  const gql = `
    query ($season: MediaSeason, $year: Int, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const { data } = await api.post("", {
      query: gql,
      variables: { season, year, page, perPage },
    });

    if (data.errors) throw new Error(data.errors[0].message);
    return data.data.Page.media;
  } catch (err) {
    throw new Error(`AniList seasonal fetch failed: ${err.message}`);
  }
}

// ── Get trending anime ────────────────────────────────────────────────────────
async function getTrendingAnime(page = 1, perPage = 20) {
  const gql = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(type: ANIME, sort: TRENDING_DESC, status_not: NOT_YET_RELEASED) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;

  try {
    const { data } = await api.post("", {
      query: gql,
      variables: { page, perPage },
    });

    if (data.errors) throw new Error(data.errors[0].message);
    return data.data.Page.media;
  } catch (err) {
    throw new Error(`AniList trending fetch failed: ${err.message}`);
  }
}

// ── Get episode list (AniList streamingEpisodes + generated list) ─────────────
async function getEpisodeList(id) {
  const gql = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        episodes
        title { romaji english }
        streamingEpisodes {
          title
          thumbnail
          url
          site
        }
        nextAiringEpisode {
          episode
          timeUntilAiring
        }
      }
    }
  `;

  try {
    const { data } = await api.post("", {
      query: gql,
      variables: { id: parseInt(id) },
    });

    if (data.errors) throw new Error(data.errors[0].message);

    const media      = data.data.Media;
    const totalEps   = media.episodes || 0;
    const streaming  = media.streamingEpisodes || [];
    const nextAiring = media.nextAiringEpisode;

    // Build episode list from count
    const episodes = [];
    const maxEp = nextAiring ? nextAiring.episode - 1 : totalEps;

    for (let i = 1; i <= (maxEp || totalEps || 0); i++) {
      // Try to match streaming episode metadata if available
      const meta = streaming.find((s) => {
        const titleMatch = s.title?.match(/Episode\s+(\d+)/i);
        return titleMatch && parseInt(titleMatch[1]) === i;
      });

      episodes.push({
        number:    i,
        id:        `ep_${id}_${i}`,
        title:     meta?.title || `Episode ${i}`,
        thumbnail: meta?.thumbnail || null,
        aired:     true,
      });
    }

    return {
      episodes,
      total:      totalEps,
      nextAiring,
      animeTitle: media.title,
    };
  } catch (err) {
    throw new Error(`AniList episode list failed: ${err.message}`);
  }
}

module.exports = {
  searchAnime,
  getAnimeById,
  getSeasonalAnime,
  getTrendingAnime,
  getEpisodeList,   // ← add this
};