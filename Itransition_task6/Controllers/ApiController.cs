using Microsoft.AspNetCore.Mvc;

namespace Itransition_task6.Controllers
{
    public class ApiController : Controller
    {
        public IActionResult Index()
        {
            return View();
        }
    }
}
