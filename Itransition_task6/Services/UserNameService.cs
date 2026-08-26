using Microsoft.AspNetCore.Http;

namespace Itransition_task6.Services;

public class UserNameService
{
    private const string SessionKey = "DisplayName";

    private readonly IHttpContextAccessor _httpContextAccessor;

    public UserNameService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public string? GetName()
    {
        return _httpContextAccessor.HttpContext?
            .Session
            .GetString(SessionKey);
    }

    public void SetName(string name)
    {
        _httpContextAccessor.HttpContext?
            .Session
            .SetString(SessionKey, name);
    }
}