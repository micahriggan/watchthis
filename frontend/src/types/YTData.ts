export type YTData = {
  kind: string;
  etag: string;
  items: [
    {
      id: string;
      kind: string;
      etag: string;
      snippet: {
        publishedAt: string;
        channelId: string;
        title: string;
        description: string;
        thumbnails: {
          default: {
            url: string;
          };
          medium: {
            url: string;
          };
          high: {
            url: string;
          };
        };
        categoryId: string;
      };
      contentDetails: {
        duration: string;
        aspectRatio: string;
      };
      statistics: {
        viewCount: string;
        likeCount: string;
        dislikeCount: string;
        favoriteCount: string;
        commentCount: string;
      };
      status: {
        uploadStatus: string;
        privacyStatus: string;
      };
    }
  ];
};
