using System.Collections.Generic;
using UnityEngine;
using UnityEngine.UI;
using TMPro;

namespace Visora.UI
{
    /// <summary>
    /// Renders a real-time V-I (or X-Y) graph using actual collected simulation data.
    /// IMPORTANT: Every point on this graph represents REAL measured data — never interpolated or faked.
    /// The graph renders inside a Unity UI RawImage using a Texture2D.
    /// </summary>
    public class GraphRenderer : MonoBehaviour
    {
        [Header("Graph Display")]
        [SerializeField] private RawImage _graphImage;
        [SerializeField] private int _textureWidth = 400;
        [SerializeField] private int _textureHeight = 300;

        [Header("Axis Labels")]
        [SerializeField] private TextMeshProUGUI _xAxisLabel;
        [SerializeField] private TextMeshProUGUI _yAxisLabel;
        [SerializeField] private TextMeshProUGUI _titleLabel;
        [SerializeField] private TextMeshProUGUI _slopeLabel;

        [Header("Axis Configuration")]
        [SerializeField] private float _xMin = 0f;
        [SerializeField] private float _xMax = 10f;   // V (Voltage)
        [SerializeField] private float _yMin = 0f;
        [SerializeField] private float _yMax = 1f;    // A (Current)
        [SerializeField] private int _gridDivisions = 5;

        [Header("Visual Style")]
        [SerializeField] private Color _backgroundColor = new Color(0.04f, 0.06f, 0.10f, 1f);
        [SerializeField] private Color _gridColor = new Color(0.15f, 0.2f, 0.28f, 1f);
        [SerializeField] private Color _axisColor = new Color(0.3f, 0.45f, 0.6f, 1f);
        [SerializeField] private Color _dataColor = new Color(0.25f, 0.75f, 1f, 1f);
        [SerializeField] private Color _trendlineColor = new Color(1f, 0.55f, 0.15f, 0.9f);
        [SerializeField] private int _dotRadius = 4;

        private Texture2D _texture;
        private List<Vector2> _dataPoints = new List<Vector2>();
        private int _padding = 30;

        private void Awake()
        {
            _texture = new Texture2D(_textureWidth, _textureHeight, TextureFormat.RGBA32, false);
            _texture.filterMode = FilterMode.Bilinear;

            if (_graphImage != null)
                _graphImage.texture = _texture;

            if (_xAxisLabel != null) _xAxisLabel.text = "Voltage (V)";
            if (_yAxisLabel != null) _yAxisLabel.text = "Current (A)";
            if (_titleLabel != null) _titleLabel.text = "V-I Characteristic";

            ClearGraph();
        }

        /// <summary>
        /// Add a real data point from the simulation and redraw the graph.
        /// </summary>
        public void AddDataPoint(float x, float y)
        {
            _dataPoints.Add(new Vector2(x, y));

            // Auto-scale Y axis
            if (y > _yMax * 0.9f)
            {
                _yMax = y * 1.2f;
            }

            Redraw();

            // Update slope display if we have enough points
            if (_dataPoints.Count >= 2)
            {
                float slope = CalculateLinearRegressionSlope();
                if (_slopeLabel != null)
                    _slopeLabel.text = $"R = slope = {slope:F2} Ω";
            }
        }

        /// <summary>
        /// Clear all data and redraw empty graph.
        /// </summary>
        public void ClearGraph()
        {
            _dataPoints.Clear();
            _yMax = 1f;
            Redraw();
            if (_slopeLabel != null) _slopeLabel.text = "";
        }

        private void Redraw()
        {
            // Fill background
            FillBackground();

            // Draw grid lines
            DrawGrid();

            // Draw axes
            DrawAxes();

            // Draw trendline (if enough points)
            if (_dataPoints.Count >= 2)
                DrawTrendline();

            // Draw all data points on top
            foreach (var point in _dataPoints)
                DrawDataPoint(point);

            _texture.Apply();
        }

        private void FillBackground()
        {
            Color[] pixels = new Color[_textureWidth * _textureHeight];
            for (int i = 0; i < pixels.Length; i++)
                pixels[i] = _backgroundColor;
            _texture.SetPixels(pixels);
        }

        private void DrawGrid()
        {
            // Vertical grid lines
            for (int i = 0; i <= _gridDivisions; i++)
            {
                float t = (float)i / _gridDivisions;
                int x = Mathf.RoundToInt(Mathf.Lerp(_padding, _textureWidth - _padding, t));
                DrawVerticalLine(x, _padding, _textureHeight - _padding, _gridColor);
            }

            // Horizontal grid lines
            for (int i = 0; i <= _gridDivisions; i++)
            {
                float t = (float)i / _gridDivisions;
                int y = Mathf.RoundToInt(Mathf.Lerp(_padding, _textureHeight - _padding, t));
                DrawHorizontalLine(_padding, _textureWidth - _padding, y, _gridColor);
            }
        }

        private void DrawAxes()
        {
            // X axis (bottom)
            DrawHorizontalLine(_padding, _textureWidth - _padding, _padding, _axisColor, 2);
            // Y axis (left)
            DrawVerticalLine(_padding, _padding, _textureHeight - _padding, _axisColor, 2);
        }

        private void DrawDataPoint(Vector2 dataPoint)
        {
            Vector2Int pixel = DataToPixel(dataPoint);
            DrawCircle(pixel.x, pixel.y, _dotRadius, _dataColor);
        }

        private void DrawTrendline()
        {
            // Calculate best-fit line using least squares (V = R × I → I = V/R)
            float slope, intercept;
            CalculateLinearRegression(out slope, out intercept);

            // Draw line from x=0 to x=xMax
            Vector2Int p0 = DataToPixel(new Vector2(_xMin, slope * _xMin + intercept));
            Vector2Int p1 = DataToPixel(new Vector2(_xMax, slope * _xMax + intercept));

            // Clamp to graph area
            p0.x = Mathf.Clamp(p0.x, _padding, _textureWidth - _padding);
            p0.y = Mathf.Clamp(p0.y, _padding, _textureHeight - _padding);
            p1.x = Mathf.Clamp(p1.x, _padding, _textureWidth - _padding);
            p1.y = Mathf.Clamp(p1.y, _padding, _textureHeight - _padding);

            DrawLine(p0, p1, _trendlineColor, 2);
        }

        // ── Coordinate Conversion ─────────────────────────────────────────────

        private Vector2Int DataToPixel(Vector2 dataPoint)
        {
            int px = Mathf.RoundToInt(Mathf.Lerp(_padding, _textureWidth - _padding,
                Mathf.InverseLerp(_xMin, _xMax, dataPoint.x)));
            int py = Mathf.RoundToInt(Mathf.Lerp(_padding, _textureHeight - _padding,
                Mathf.InverseLerp(_yMin, _yMax, dataPoint.y)));
            return new Vector2Int(px, py);
        }

        // ── Pixel Drawing Primitives ─────────────────────────────────────────

        private void DrawCircle(int cx, int cy, int radius, Color color)
        {
            for (int x = -radius; x <= radius; x++)
            for (int y = -radius; y <= radius; y++)
            {
                if (x * x + y * y <= radius * radius)
                {
                    int px = cx + x;
                    int py = cy + y;
                    if (px >= 0 && px < _textureWidth && py >= 0 && py < _textureHeight)
                        _texture.SetPixel(px, py, color);
                }
            }
        }

        private void DrawHorizontalLine(int x0, int x1, int y, Color color, int thickness = 1)
        {
            for (int x = x0; x <= x1; x++)
            for (int t = 0; t < thickness; t++)
                if (x >= 0 && x < _textureWidth && y + t >= 0 && y + t < _textureHeight)
                    _texture.SetPixel(x, y + t, color);
        }

        private void DrawVerticalLine(int x, int y0, int y1, Color color, int thickness = 1)
        {
            for (int y = y0; y <= y1; y++)
            for (int t = 0; t < thickness; t++)
                if (x + t >= 0 && x + t < _textureWidth && y >= 0 && y < _textureHeight)
                    _texture.SetPixel(x + t, y, color);
        }

        private void DrawLine(Vector2Int p0, Vector2Int p1, Color color, int thickness = 1)
        {
            // Bresenham's line algorithm
            int dx = Mathf.Abs(p1.x - p0.x);
            int dy = Mathf.Abs(p1.y - p0.y);
            int sx = p0.x < p1.x ? 1 : -1;
            int sy = p0.y < p1.y ? 1 : -1;
            int err = dx - dy;
            int x = p0.x, y = p0.y;

            while (true)
            {
                for (int t = -thickness / 2; t <= thickness / 2; t++)
                    if (x >= 0 && x < _textureWidth && y + t >= 0 && y + t < _textureHeight)
                        _texture.SetPixel(x, y + t, color);

                if (x == p1.x && y == p1.y) break;
                int e2 = 2 * err;
                if (e2 > -dy) { err -= dy; x += sx; }
                if (e2 < dx)  { err += dx; y += sy; }
            }
        }

        // ── Statistics ─────────────────────────────────────────────────────────

        private void CalculateLinearRegression(out float slope, out float intercept)
        {
            // For V vs I data: I = (1/R) × V → slope of I vs V = 1/R
            // We're plotting V (x) vs I (y), so slope = 1/R
            int n = _dataPoints.Count;
            float sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

            foreach (var p in _dataPoints)
            {
                sumX  += p.x;
                sumY  += p.y;
                sumXY += p.x * p.y;
                sumX2 += p.x * p.x;
            }

            float denom = n * sumX2 - sumX * sumX;
            slope     = denom != 0 ? (n * sumXY - sumX * sumY) / denom : 0f;
            intercept = (sumY - slope * sumX) / n;
        }

        private float CalculateLinearRegressionSlope()
        {
            CalculateLinearRegression(out float slope, out _);
            // slope of I vs V is 1/R, so R = 1/slope
            return slope > 0.0001f ? 1f / slope : 0f;
        }

        private void OnDestroy()
        {
            if (_texture != null)
                Destroy(_texture);
        }
    }
}
