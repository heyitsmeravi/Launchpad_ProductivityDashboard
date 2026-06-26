import { ImportDocument } from "./ImportDocument.js";

// YouTube Provider implementation
export class YouTubePlaylistProvider {
  canParse(url, data) {
    return (url && url.includes("youtube.com")) || (data && data.includes("playlistVideoRenderer"));
  }

  parse(url, htmlContent) {
    let jsonStr = "";
    if (htmlContent) {
      const marker = "var ytInitialData = ";
      const idx = htmlContent.indexOf(marker);
      if (idx !== -1) {
        const start = idx + marker.length;
        // Simple search for the enclosing semicolon
        const end = htmlContent.indexOf("};", start);
        if (end !== -1) {
          jsonStr = htmlContent.substring(start, end + 1);
        }
      }
    }

    if (!jsonStr) {
      const err = new Error("Could not extract ytInitialData from YouTube playlist HTML.");
      err.code = "IMP-PARSE-002";
      throw err;
    }

    let ytData;
    try {
      ytData = JSON.parse(jsonStr);
    } catch (e) {
      const err = new Error("Failed to parse YouTube initial data JSON: " + e.message);
      err.code = "IMP-PARSE-004";
      throw err;
    }
    const videos = [];
    const warnings = [];

    const findVideos = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.playlistVideoRenderer) {
        const videoRenderer = obj.playlistVideoRenderer;
        const videoId = videoRenderer.videoId;
        const title = videoRenderer.title?.runs?.[0]?.text || `Video ${videos.length + 1}`;
        const duration = videoRenderer.lengthText?.simpleText || "0:00";
        
        if (videoId && !videos.some(v => v.videoId === videoId)) {
          videos.push({
            title: `${title} (${duration})`,
            videoId: videoId,
            link: `https://www.youtube.com/watch?v=${videoId}`,
            durationText: duration
          });
        }
        return;
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          findVideos(obj[key]);
        }
      }
    };

    findVideos(ytData);

    let playlistTitle = "Imported YouTube Playlist";
    const findTitle = (obj) => {
      if (!obj || typeof obj !== "object") return;
      if (obj.playlistMetadataRenderer && obj.playlistMetadataRenderer.title) {
        playlistTitle = obj.playlistMetadataRenderer.title;
        return;
      }
      if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.simpleText) {
        playlistTitle = obj.playlistHeaderRenderer.title.simpleText;
        return;
      }
      if (obj.playlistHeaderRenderer && obj.playlistHeaderRenderer.title?.runs?.[0]?.text) {
        playlistTitle = obj.playlistHeaderRenderer.title.runs[0].text;
        return;
      }
      for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
          findTitle(obj[key]);
        }
      }
    };

    findTitle(ytData);

    return {
      title: playlistTitle,
      description: `YouTube playlist imported from URL.`,
      videos,
      warnings
    };
  }
}

// Vimeo Provider implementation (Stub for future support)
export class VimeoPlaylistProvider {
  canParse(url) {
    return url && url.includes("vimeo.com");
  }

  parse() {
    const err = new Error("Vimeo playlist provider is not implemented yet.");
    err.code = "IMP-PARSE-003";
    throw err;
  }
}

// JSON Provider for Console JS snippets or exported files
export class JSONPlaylistProvider {
  canParse(url, data) {
    if (!data) return false;
    try {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) || (parsed && (Array.isArray(parsed.videos) || Array.isArray(parsed.tasks)));
    } catch {
      return false;
    }
  }

  parse(url, data) {
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (e) {
      const err = new Error("Failed to parse JSON playlist: " + e.message);
      err.code = "IMP-PARSE-004";
      throw err;
    }
    const rawVideos = Array.isArray(parsed) ? parsed : (parsed.videos || parsed.tasks || []);
    
    return {
      title: parsed.title || "Imported Console Playlist",
      description: "Playlist imported from custom JSON data payload.",
      videos: rawVideos.map((vid, idx) => ({
        title: vid.title || vid.text || `Item ${idx + 1}`,
        link: vid.link || vid.url || "",
        videoId: vid.videoId || vid.id || "",
        durationText: vid.durationText || vid.duration || ""
      })),
      warnings: []
    };
  }
}

// PlaylistParser orchestrator
export class PlaylistParser {
  static providers = [
    new YouTubePlaylistProvider(),
    new VimeoPlaylistProvider(),
    new JSONPlaylistProvider()
  ];

  static registerProvider(provider) {
    this.providers.push(provider);
  }

  static parse(url, data) {
    const provider = this.providers.find(p => p.canParse(url, data));
    if (!provider) {
      const err = new Error("No compatible playlist provider found for this source.");
      err.code = "IMP-PARSE-003";
      throw err;
    }

    const result = provider.parse(url, data);

    // Map provider result to ImportDocument
    const rows = result.videos.map((vid, idx) => ({
      title: vid.title,
      moduleName: "", // Playlists are flat by default
      link: vid.link,
      originalIndex: idx + 1,
      metadata: {
        videoId: vid.videoId,
        durationText: vid.durationText
      }
    }));

    return new ImportDocument({
      source: "playlist",
      schemaVersion: 1,
      metadata: {
        title: result.title,
        category: "skill",
        description: result.description
      },
      rows,
      warnings: result.warnings || []
    });
  }
}
