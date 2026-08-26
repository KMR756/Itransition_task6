
using Itransition_task6.Data;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace CircuitFlow.Controllers;

public class CircuitController : Controller
{
    private readonly AppDbContext _db;

    public CircuitController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet]
    public async Task<IActionResult> Editor(Guid id)
    {
        var circuit = await _db.Circuits
            .Include(x => x.Nodes)
            .Include(x => x.Wires)
            .FirstOrDefaultAsync(x => x.Id == id);

        if (circuit == null)
            return NotFound();

        ViewBag.DisplayName =
            HttpContext.Session.GetString("DisplayName");

        return View(circuit);
    }
}