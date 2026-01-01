// @ts-check

import { afterEach, describe, expect, it, jest } from "@jest/globals";
import "@testing-library/jest-dom";
import axios from "axios";
import MockAdapter from "axios-mock-adapter";
import topLangs from "../api/top-langs.js";
import { renderTopLanguages } from "../src/cards/top-languages.js";
import { renderError } from "../src/common/render.js";
import { CACHE_TTL, DURATIONS } from "../src/common/cache.js";
import { applyLanguageColorOverrides } from "../src/fetchers/top-languages.js";

const data_langs = {
  data: {
    user: {
      repositories: {
        nodes: [
          {
            languages: {
              edges: [{ size: 150, node: { color: "#0f0", name: "HTML" } }],
            },
          },
          {
            languages: {
              edges: [{ size: 100, node: { color: "#0f0", name: "HTML" } }],
            },
          },
          {
            languages: {
              edges: [
                { size: 100, node: { color: "#0ff", name: "javascript" } },
              ],
            },
          },
          {
            languages: {
              edges: [
                { size: 100, node: { color: "#0ff", name: "javascript" } },
              ],
            },
          },
        ],
      },
    },
  },
};

const error = {
  errors: [
    {
      type: "NOT_FOUND",
      path: ["user"],
      locations: [],
      message: "Could not fetch user",
    },
  ],
};

const langs = {
  HTML: {
    color: "#0f0",
    name: "HTML",
    size: 250,
  },
  javascript: {
    color: "#0ff",
    name: "javascript",
    size: 200,
  },
};

const mock = new MockAdapter(axios);

afterEach(() => {
  mock.reset();
});

describe("Test /api/top-langs", () => {
  it("should test the request", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(langs));
  });

  it("should work with the query options", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        hide_title: true,
        card_width: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderTopLanguages(langs, {
        hide_title: true,
        card_width: 100,
        title_color: "fff",
        icon_color: "fff",
        text_color: "fff",
        bg_color: "fff",
      }),
    );
  });

  it("should render error card on user data fetch error", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, error);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: error.errors[0].message,
        secondaryMessage:
          "Make sure the provided username is not an organization",
      }),
    );
  });

  it("should render error card on incorrect layout input", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        layout: ["pie"],
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Incorrect layout input",
      }),
    );
  });

  it("should render error card if username in blacklist", async () => {
    const req = {
      query: {
        username: "renovate-bot",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "This username is blacklisted",
        secondaryMessage: "Please deploy your own instance",
        renderOptions: { show_repo_link: false },
      }),
    );
  });

  it("should render error card if wrong locale provided", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        locale: "asdf",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.send).toHaveBeenCalledWith(
      renderError({
        message: "Something went wrong",
        secondaryMessage: "Locale not found",
      }),
    );
  });

  it("should have proper cache", async () => {
    const req = {
      query: {
        username: "anuraghazra",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    expect(res.setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      `max-age=${CACHE_TTL.TOP_LANGS_CARD.DEFAULT}, ` +
        `s-maxage=${CACHE_TTL.TOP_LANGS_CARD.DEFAULT}, ` +
        `stale-while-revalidate=${DURATIONS.ONE_DAY}`,
    );
  });

  it("should work with custom lang_colors parameter", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        lang_colors: JSON.stringify({ HTML: "ff0000", javascript: "00ff00" }),
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    // Verify that custom colors are applied
    const expectedLangs = {
      HTML: {
        color: "#ff0000",
        name: "HTML",
        size: 250,
      },
      javascript: {
        color: "#00ff00",
        name: "javascript",
        size: 200,
      },
    };
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(expectedLangs));
  });

  it("should work with custom lang_colors with hash prefix", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        lang_colors: JSON.stringify({ HTML: "#ff0000" }),
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    // Verify that color with hash is preserved
    const expectedLangs = {
      HTML: {
        color: "#ff0000",
        name: "HTML",
        size: 250,
      },
      javascript: {
        color: "#0ff",
        name: "javascript",
        size: 200,
      },
    };
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(expectedLangs));
  });

  it("should handle invalid JSON in lang_colors gracefully", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        lang_colors: "invalid-json",
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    // Should fall back to default colors
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(langs));
  });

  it("should support case-insensitive language matching in lang_colors", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        lang_colors: JSON.stringify({ html: "ff0000", JAVASCRIPT: "00ff00" }),
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    // Verify that case-insensitive matching works
    const expectedLangs = {
      HTML: {
        color: "#ff0000",
        name: "HTML",
        size: 250,
      },
      javascript: {
        color: "#00ff00",
        name: "javascript",
        size: 200,
      },
    };
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(expectedLangs));
  });

  it("should work with empty lang_colors", async () => {
    const req = {
      query: {
        username: "anuraghazra",
        lang_colors: JSON.stringify({}),
      },
    };
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    };
    mock.onPost("https://api.github.com/graphql").reply(200, data_langs);

    await topLangs(req, res);

    expect(res.setHeader).toHaveBeenCalledWith("Content-Type", "image/svg+xml");
    // Should use default colors
    expect(res.send).toHaveBeenCalledWith(renderTopLanguages(langs));
  });
});

describe("Test applyLanguageColorOverrides", () => {
  it("should apply custom colors correctly", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
      Python: { name: "Python", color: "#3572A5", size: 80 },
    };
    const customColors = {
      JavaScript: "ff0000",
      Python: "00ff00",
    };

    const result = applyLanguageColorOverrides(topLangs, customColors);

    expect(result.JavaScript.color).toBe("#ff0000");
    expect(result.Python.color).toBe("#00ff00");
  });

  it("should preserve hash prefix in custom colors", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
    };
    const customColors = {
      JavaScript: "#ff0000",
    };

    const result = applyLanguageColorOverrides(topLangs, customColors);

    expect(result.JavaScript.color).toBe("#ff0000");
  });

  it("should handle case-insensitive language name matching", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
      Python: { name: "Python", color: "#3572A5", size: 80 },
    };
    const customColors = {
      javascript: "ff0000",
      PYTHON: "00ff00",
    };

    const result = applyLanguageColorOverrides(topLangs, customColors);

    expect(result.JavaScript.color).toBe("#ff0000");
    expect(result.Python.color).toBe("#00ff00");
  });

  it("should return original data when no custom colors provided", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
      Python: { name: "Python", color: "#3572A5", size: 80 },
    };

    const result = applyLanguageColorOverrides(topLangs, {});

    expect(result).toEqual(topLangs);
  });

  it("should return original data when custom colors is null", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
    };

    const result = applyLanguageColorOverrides(topLangs, null);

    expect(result).toEqual(topLangs);
  });

  it("should only override colors for specified languages", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
      Python: { name: "Python", color: "#3572A5", size: 80 },
      Java: { name: "Java", color: "#b07219", size: 60 },
    };
    const customColors = {
      JavaScript: "ff0000",
    };

    const result = applyLanguageColorOverrides(topLangs, customColors);

    expect(result.JavaScript.color).toBe("#ff0000");
    expect(result.Python.color).toBe("#3572A5");
    expect(result.Java.color).toBe("#b07219");
  });

  it("should not mutate the original topLangs object", () => {
    const topLangs = {
      JavaScript: { name: "JavaScript", color: "#f1e05a", size: 100 },
    };
    const customColors = {
      JavaScript: "ff0000",
    };
    const originalColor = topLangs.JavaScript.color;

    applyLanguageColorOverrides(topLangs, customColors);

    expect(topLangs.JavaScript.color).toBe(originalColor);
  });
});
