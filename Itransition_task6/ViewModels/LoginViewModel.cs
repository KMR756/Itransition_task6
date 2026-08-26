using System.ComponentModel.DataAnnotations;

namespace Itransition_task6.ViewModels;

public class LoginViewModel
{
    [Required]
    [StringLength(40, MinimumLength = 2)]
    public string Name { get; set; } = string.Empty;
}