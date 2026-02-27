import uuid

from django.db import models

from traces.utils import Category


class Trace(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user_message = models.TextField()
    bot_response = models.TextField()
    category = models.CharField(
        max_length=50,
        choices=Category.choices
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    response_time_ms = models.IntegerField()

    def __str__(self):
        return f"{self.category} | {self.timestamp}"
