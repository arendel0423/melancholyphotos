using Microsoft.AspNetCore.Mvc;
using TagLib;

namespace MelancholyPhotos.Server.Controllers
{
    [ApiController]
    [Route("api/about-playlist")]
    public class AboutPlaylistController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public AboutPlaylistController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet]
        public IActionResult GetTracks()
        {
            var playlistPath = System.IO.Path.Combine(_env.WebRootPath, "about-playlist");
            if (!System.IO.Directory.Exists(playlistPath))
                return Ok(Array.Empty<object>());

            var audioExtensions = new[] { "*.mp3", "*.ogg", "*.wav", "*.flac", "*.m4a" };
            var tracks = audioExtensions
                .SelectMany(ext => System.IO.Directory.GetFiles(playlistPath, ext))
                .OrderBy(f => f)
                .Select((filePath, index) =>
                {
                    var fileName = System.IO.Path.GetFileNameWithoutExtension(filePath);
                    var title = ToTitleCase(fileName.Replace('_', ' ').Replace('-', ' '));
                    var artist = "";
                    var album = "";

                    try
                    {
                        using var tagFile = TagLib.File.Create(filePath);
                        if (!string.IsNullOrWhiteSpace(tagFile.Tag.Title))
                            title = tagFile.Tag.Title.Trim();
                        if (tagFile.Tag.Performers?.Length > 0)
                            artist = string.Join(", ", tagFile.Tag.Performers).Trim();
                        if (!string.IsNullOrWhiteSpace(tagFile.Tag.Album))
                            album = tagFile.Tag.Album.Trim();
                    }
                    catch { /* unreadable tags — keep filename-derived values */ }

                    var metaPath = System.IO.Path.ChangeExtension(filePath, ".txt");
                    if (System.IO.File.Exists(metaPath))
                    {
                        var lines = System.IO.File.ReadAllLines(metaPath);
                        if (lines.Length > 0 && !string.IsNullOrWhiteSpace(lines[0]))
                            title = lines[0].Trim();
                        if (lines.Length > 1 && !string.IsNullOrWhiteSpace(lines[1]))
                            artist = lines[1].Trim();
                        if (lines.Length > 2 && !string.IsNullOrWhiteSpace(lines[2]))
                            album = lines[2].Trim();
                    }

                    var src = $"/about-playlist/{Uri.EscapeDataString(System.IO.Path.GetFileName(filePath))}";
                    return new { id = index + 1, title, artist, album, src };
                })
                .ToList();

            return Ok(tracks);
        }

        private static string ToTitleCase(string s)
        {
            if (string.IsNullOrEmpty(s)) return s;
            return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(s.ToLower());
        }
    }
}
