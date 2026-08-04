# mcp-nhl

NHL MCP — live NHL data via the official NHL API

Part of [Pipeworx](https://pipeworx.io) — an MCP gateway connecting AI agents to 1394+ live data sources.

## Tools

| Tool | Description |
|------|-------------|
| `get_standings` | Check current NHL standings. Returns wins, losses, OT losses, points, goals for/against, and streak info for all teams. |
| `get_scores` | Get today's NHL game scores and status (live, final, or scheduled). Returns teams, scores, shots on goal, and current period. |
| `get_schedule` | Get the current NHL weekly schedule. Returns upcoming and recent games with teams, dates, times, and venues. |
| `get_player` | Get an NHL player's profile and current season stats by player ID. Returns bio, position, team, and season statistics. |

## Quick Start

Add to your MCP client (Claude Desktop, Cursor, Windsurf, etc.):

```json
{
  "mcpServers": {
    "nhl": {
      "url": "https://gateway.pipeworx.io/nhl/mcp"
    }
  }
}
```

Or connect to the full Pipeworx gateway for access to all 1394+ data sources:

```json
{
  "mcpServers": {
    "pipeworx": {
      "url": "https://gateway.pipeworx.io/mcp"
    }
  }
}
```

## Using with ask_pipeworx

Instead of calling tools directly, you can ask questions in plain English:

```
ask_pipeworx({ question: "your question about Nhl data" })
```

The gateway picks the right tool and fills the arguments automatically.

## More

- [Docs and guides](https://pipeworx.io/docs)
- [pipeworx.io](https://pipeworx.io)

## License

MIT
