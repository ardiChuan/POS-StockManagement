using System.Net.Http.Json;
using System.Text.Json;

namespace AponkRed.Api.Services;

public class SupabaseService(HttpClient http)
{
    public static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        PropertyNameCaseInsensitive = true
    };

    public async Task<List<T>> Select<T>(string table, string query = "select=*")
    {
        var res = await http.GetAsync($"/rest/v1/{table}?{query}");
        if (!res.IsSuccessStatusCode) return [];
        return await res.Content.ReadFromJsonAsync<List<T>>(JsonOpts) ?? [];
    }

    public async Task<T?> SelectOne<T>(string table, string query)
    {
        var list = await Select<T>(table, query + "&limit=1");
        return list.Count > 0 ? list[0] : default;
    }

    public async Task<(List<T> Data, int Count)> SelectPaged<T>(string table, string query)
    {
        var req = new HttpRequestMessage(HttpMethod.Get, $"/rest/v1/{table}?{query}");
        req.Headers.Add("Prefer", "count=exact");
        var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return ([], 0);

        int count = 0;
        if (res.Headers.TryGetValues("Content-Range", out var values))
        {
            var range = values.FirstOrDefault();
            if (range != null && range.Contains('/') && int.TryParse(range.Split('/')[1], out var total))
                count = total;
        }

        var data = await res.Content.ReadFromJsonAsync<List<T>>(JsonOpts) ?? [];
        return (data, count);
    }

    public async Task<T?> Insert<T>(string table, object data)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/rest/v1/{table}")
        {
            Content = JsonContent.Create(data, options: JsonOpts)
        };
        req.Headers.Add("Prefer", "return=representation");
        var res = await http.SendAsync(req);
        res.EnsureSuccessStatusCode();
        var list = await res.Content.ReadFromJsonAsync<List<T>>(JsonOpts);
        return list != null && list.Count > 0 ? list[0] : default;
    }

    public async Task InsertMany(string table, object data)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/rest/v1/{table}")
        {
            Content = JsonContent.Create(data, options: JsonOpts)
        };
        var res = await http.SendAsync(req);
        res.EnsureSuccessStatusCode();
    }

    public async Task Upsert(string table, object data)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, $"/rest/v1/{table}")
        {
            Content = JsonContent.Create(data, options: JsonOpts)
        };
        req.Headers.Add("Prefer", "resolution=merge-duplicates");
        var res = await http.SendAsync(req);
        res.EnsureSuccessStatusCode();
    }

    public async Task<T?> Update<T>(string table, string filter, object data)
    {
        var req = new HttpRequestMessage(HttpMethod.Patch, $"/rest/v1/{table}?{filter}")
        {
            Content = JsonContent.Create(data, options: JsonOpts)
        };
        req.Headers.Add("Prefer", "return=representation");
        var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return default;
        var list = await res.Content.ReadFromJsonAsync<List<T>>(JsonOpts);
        return list != null && list.Count > 0 ? list[0] : default;
    }

    public async Task Update(string table, string filter, object data)
    {
        var res = await http.PatchAsJsonAsync($"/rest/v1/{table}?{filter}", data, JsonOpts);
        res.EnsureSuccessStatusCode();
    }

    public async Task Delete(string table, string filter)
    {
        var res = await http.DeleteAsync($"/rest/v1/{table}?{filter}");
        res.EnsureSuccessStatusCode();
    }

    public async Task<int> Count(string table, string filter = "")
    {
        var url = $"/rest/v1/{table}?select=id&{filter}";
        var req = new HttpRequestMessage(HttpMethod.Head, url);
        req.Headers.Add("Prefer", "count=exact");
        var res = await http.SendAsync(req);
        if (!res.IsSuccessStatusCode) return 0;
        if (res.Headers.TryGetValues("Content-Range", out var values))
        {
            var range = values.FirstOrDefault();
            if (range != null && range.Contains('/') && int.TryParse(range.Split('/')[1], out var total))
                return total;
        }
        return 0;
    }
}
