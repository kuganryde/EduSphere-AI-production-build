import asyncio

async def frame_generator(stream_url):
    while True:
        # Simulate frame sampling
        await asyncio.sleep(5)
        yield "frame_data"
