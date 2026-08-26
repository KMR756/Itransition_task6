
using Itransition_task6.Services;
using Itransition_task6.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace CircuitFlow.Controllers;

public class HomeController : Controller
{
    private readonly PresenceService _presenceService;

    public HomeController(PresenceService presenceService)
    {
        _presenceService = presenceService;
    }

    public IActionResult Index()
    {
        var name = HttpContext.Session.GetString("DisplayName");

        if (string.IsNullOrWhiteSpace(name))
            return RedirectToAction(nameof(Login));

        return View();
    }

    [HttpGet]
    public IActionResult Login()
    {
        return View();
    }

    [HttpPost]
    [ValidateAntiForgeryToken]
    public IActionResult Login(LoginViewModel model)
    {
        if (!ModelState.IsValid)
            return View(model);

        var displayName = _presenceService.ReserveName(
            model.Name.Trim());

        HttpContext.Session.SetString(
            "DisplayName",
            displayName);

        return RedirectToAction(nameof(Index));
    }

    [HttpPost]
    public IActionResult Logout()
    {
        HttpContext.Session.Clear();

        return RedirectToAction(nameof(Login));
    }
}