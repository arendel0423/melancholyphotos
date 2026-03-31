using Microsoft.AspNetCore.Mvc;

namespace MelancholyPhotos.Server.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class GalleryController : ControllerBase
    {
        private readonly IWebHostEnvironment _env;

        public GalleryController(IWebHostEnvironment env)
        {
            _env = env;
        }

        [HttpGet]
        public IActionResult GetAlbums()
        {
            var galleryPath = Path.Combine(_env.WebRootPath, "gallery");
            if (!Directory.Exists(galleryPath))
                return Ok(Array.Empty<object>());

            var albums = Directory.GetDirectories(galleryPath)
                .OrderBy(d => d)
                .Select(albumDir =>
                {
                    var albumId = Path.GetFileName(albumDir);
                    var albumTxtPath = Path.Combine(albumDir, "album.txt");
                    var albumName = System.IO.File.Exists(albumTxtPath)
                        ? System.IO.File.ReadAllText(albumTxtPath).Trim()
                        : albumId;

                    var extensions = new[] { "*.jpg", "*.jpeg", "*.png", "*.gif", "*.webp" };
                    var photos = extensions
                        .SelectMany(ext => Directory.GetFiles(albumDir, ext))
                        .OrderBy(f => f)
                        .Select(f => $"/gallery/{albumId}/{Uri.EscapeDataString(Path.GetFileName(f))}")
                        .ToList();

                    return new { id = albumId, name = albumName, photos };
                })
                .ToList();

            return Ok(albums);
        }
    }
}
