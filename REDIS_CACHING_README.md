# Redis Caching Implementation for Courses API

## Overview
This document describes the Redis caching implementation for the courses API endpoints to improve performance and reduce database load.

## Features Implemented

### 1. Cache for `getAllCoursesController`
- **Cache Key**: `all-courses:{filterString}`
- **TTL**: 1 hour (3600 seconds)
- **Filter Support**: Caches results based on query filters (isHidden, course_status, course_level, courseType)
- **Smart Key Generation**: Creates unique cache keys for different filter combinations

### 2. Cache for `getUserCoursesController`
- **Cache Key**: `user-courses:{userId}`
- **TTL**: 1 hour (3600 seconds)
- **User-Specific**: Each user has their own cached course list

### 3. Automatic Cache Invalidation
Cache is automatically invalidated when:
- New courses are created
- Existing courses are updated
- Courses are deleted
- Admins/instructors are added to courses
- Users are unenrolled from courses

## Cache Key Examples

```
all-courses:all                                    # No filters
all-courses:course_level|BEGINNER                  # Single filter
all-courses:course_status|ACTIVE|isHidden|false   # Multiple filters
user-courses:123e4567-e89b-12d3-a456-426614174000 # User-specific
```

## Utility Functions

### `redisCache.js`
Located at `src/utils/redisCache.js`

#### Functions:
- `generateAllCoursesCacheKey(filters)` - Generate cache key for filtered courses
- `setCache(key, data, ttl)` - Set cache with TTL
- `getCache(key)` - Retrieve cached data
- `invalidateAllCoursesCache()` - Clear all course caches
- `invalidateUserCoursesCache(userId)` - Clear user-specific cache

## Implementation Details

### Cache Strategy
1. **Cache-First Approach**: Check Redis before hitting database
2. **Graceful Degradation**: If Redis fails, continue with database query
3. **Automatic Invalidation**: Cache is cleared when data changes
4. **Filter-Aware Caching**: Different filter combinations have separate cache entries

### Error Handling
- Redis connection errors are logged but don't break the application
- Cache misses fall back to database queries
- Failed cache operations don't affect API responses

### Performance Benefits
- **Reduced Database Load**: Frequently accessed course lists are served from cache
- **Faster Response Times**: Cache hits return data in milliseconds
- **Scalability**: Redis can handle high concurrent read requests
- **Filter Optimization**: Each filter combination is cached separately

## Usage Examples

### Basic Caching
```javascript
// Cache is automatically checked and set in getAllCoursesController
const courses = await courseDAO.getAllCourses(filters);
// Results are cached with 1-hour TTL
```

### Manual Cache Invalidation
```javascript
const { invalidateAllCoursesCache } = require('./utils/redisCache');

// Clear all course caches
await invalidateAllCoursesCache();
```

### Custom Cache Operations
```javascript
const { setCache, getCache } = require('./utils/redisCache');

// Set custom cache
await setCache('custom-key', data, 1800); // 30 minutes

// Get cached data
const data = await getCache('custom-key');
```

## Configuration

### Redis Connection
- **URL**: Set via `REDIS_URL` environment variable
- **Host**: Set via `REDIS_HOST` environment variable
- **TLS**: Enabled by default for security
- **Connection**: Automatic connection management

### Cache TTL Settings
- **Default TTL**: 3600 seconds (1 hour)
- **Customizable**: TTL can be set per cache operation
- **Automatic Expiry**: Keys automatically expire to prevent memory bloat

## Monitoring and Debugging

### Log Messages
- Cache hits and misses are logged
- Cache invalidation events are logged
- Redis errors are logged with details

### Cache Status
```bash
# Check Redis connection
redis-cli ping

# View cache keys
redis-cli keys "all-courses:*"
redis-cli keys "user-courses:*"

# Check cache TTL
redis-cli ttl "all-courses:all"
```

## Testing

Run the Redis cache test:
```bash
node test-redis-cache.js
```

This will test:
- Cache key generation
- Setting and retrieving cache
- Cache invalidation
- Error handling

## Best Practices

1. **Cache Invalidation**: Always invalidate relevant caches when data changes
2. **TTL Management**: Use appropriate TTL values based on data freshness requirements
3. **Error Handling**: Implement graceful degradation for Redis failures
4. **Monitoring**: Monitor cache hit rates and Redis performance
5. **Memory Management**: Set appropriate TTL to prevent memory bloat

## Troubleshooting

### Common Issues
1. **Cache Not Working**: Check Redis connection and environment variables
2. **Stale Data**: Verify cache invalidation is working correctly
3. **Memory Issues**: Check TTL settings and monitor Redis memory usage
4. **Performance**: Monitor cache hit rates and adjust TTL if needed

### Debug Commands
```bash
# Check Redis logs
redis-cli monitor

# View all keys
redis-cli keys "*"

# Check memory usage
redis-cli info memory
```
